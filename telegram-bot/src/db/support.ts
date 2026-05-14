import type { Pool } from 'pg';

export const SUPPORT_REF_PREFIX = 'VI' as const;
export const SUPPORT_PAGE_SIZE = 5 as const;

export type SupportIssueRow = {
  id: string;
  referenceNumber: number;
  deviceId: string;
  email: string | null;
  subject: string | null;
  message: string;
  status: string;
  createdAt: Date;
  closedAt: Date | null;
};

export function formatSupportReference(referenceNumber: number, id: string): string {
  if (Number.isFinite(referenceNumber)) {
    return `${SUPPORT_REF_PREFIX}-${referenceNumber}`;
  }
  return `${SUPPORT_REF_PREFIX}-${id.slice(0, 8)}`;
}

export function isLikelyIssueId(id: string): boolean {
  const t = id.trim();
  return t.length >= 20 && t.length <= 36 && /^[a-z0-9]+$/i.test(t);
}

export async function listOpenSupportIssues(
  pool: Pool,
  page: number,
): Promise<SupportIssueRow[]> {
  const offset = Math.max(0, page) * SUPPORT_PAGE_SIZE;
  const { rows } = await pool.query<SupportIssueRow>(
    `SELECT id, "referenceNumber", "deviceId", email, subject, message, status, "createdAt", "closedAt"
     FROM "SupportIssue"
     WHERE status = 'open'
     ORDER BY "createdAt" DESC
     LIMIT $1 OFFSET $2`,
    [SUPPORT_PAGE_SIZE, offset],
  );
  return rows;
}

export async function countOpenSupportIssues(pool: Pool): Promise<number> {
  const { rows } = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM "SupportIssue" WHERE status = 'open'`,
  );
  return parseInt(rows[0]?.c ?? '0', 10) || 0;
}

export async function getSupportIssueById(pool: Pool, id: string): Promise<SupportIssueRow | null> {
  if (!isLikelyIssueId(id)) return null;
  const { rows } = await pool.query<SupportIssueRow>(
    `SELECT id, "referenceNumber", "deviceId", email, subject, message, status, "createdAt", "closedAt"
     FROM "SupportIssue" WHERE id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export type SupportStats = {
  totalOpen: number;
  openCreatedInLast7Days: number;
  openCreatedInLast30Days: number;
};

export async function getSupportStats(pool: Pool): Promise<SupportStats> {
  const now = Date.now();
  const d7 = new Date(now - 7 * 86400000);
  const d30 = new Date(now - 30 * 86400000);
  const [totalOpen, open7, open30] = await Promise.all([
    pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM "SupportIssue" WHERE status = 'open'`,
    ),
    pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM "SupportIssue" WHERE status = 'open' AND "createdAt" >= $1`,
      [d7],
    ),
    pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM "SupportIssue" WHERE status = 'open' AND "createdAt" >= $1`,
      [d30],
    ),
  ]);
  return {
    totalOpen: parseInt(totalOpen.rows[0]?.c ?? '0', 10) || 0,
    openCreatedInLast7Days: parseInt(open7.rows[0]?.c ?? '0', 10) || 0,
    openCreatedInLast30Days: parseInt(open30.rows[0]?.c ?? '0', 10) || 0,
  };
}

export async function setSupportIssueStatus(
  pool: Pool,
  issueId: string,
  status: 'open' | 'closed',
  auditIdentity: { adminLogin: string; adminId: string },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isLikelyIssueId(issueId)) {
    return { ok: false, reason: 'Invalid issue id' };
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (status === 'closed') {
      const up = await client.query(
        `UPDATE "SupportIssue" SET status = 'closed', "closedAt" = NOW(), "updatedAt" = NOW() WHERE id = $1 AND status = 'open'`,
        [issueId],
      );
      if (up.rowCount === 0) {
        await client.query('ROLLBACK');
        return { ok: false, reason: 'Issue not found or already closed' };
      }
    } else {
      const up = await client.query(
        `UPDATE "SupportIssue" SET status = 'open', "closedAt" = NULL, "updatedAt" = NOW() WHERE id = $1`,
        [issueId],
      );
      if (up.rowCount === 0) {
        await client.query('ROLLBACK');
        return { ok: false, reason: 'Issue not found' };
      }
    }
    await insertSupportStatusAudit(client, issueId, status, auditIdentity);
    await client.query('COMMIT');
    return { ok: true };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[setSupportIssueStatus]', e);
    return { ok: false, reason: 'Database error' };
  } finally {
    client.release();
  }
}

async function insertSupportStatusAudit(
  client: { query: (sql: string, params?: unknown[]) => Promise<unknown> },
  issueId: string,
  status: 'open' | 'closed',
  auditIdentity: { adminLogin: string; adminId: string },
): Promise<void> {
  const { randomUUID } = await import('node:crypto');
  const id = randomUUID();
  const metaJson = JSON.stringify({ issueId, status, source: 'telegram_bot' });
  await client.query(
    `INSERT INTO "AdminAuditLog" (id, "createdAt", "adminId", "adminLogin", action, metadata)
     VALUES ($1, NOW(), $2, $3, $4, $5::jsonb)`,
    [id, auditIdentity.adminId, auditIdentity.adminLogin, 'support.status', metaJson],
  );
}
