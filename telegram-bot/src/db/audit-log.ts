import type { Pool } from 'pg';

export const AUDIT_PAGE_SIZE = 8 as const;

export type AuditRow = {
  id: string;
  createdAt: Date;
  adminLogin: string;
  action: string;
  metadata: unknown;
};

/** Fetch page+1 row to detect hasMore. */
export async function listAuditLogPageWithExtra(pool: Pool, page: number): Promise<AuditRow[]> {
  const offset = Math.max(0, page) * AUDIT_PAGE_SIZE;
  const { rows } = await pool.query<AuditRow>(
    `SELECT id, "createdAt", "adminLogin", action, metadata
     FROM "AdminAuditLog"
     ORDER BY "createdAt" DESC, id DESC
     LIMIT $1 OFFSET $2`,
    [AUDIT_PAGE_SIZE + 1, offset],
  );
  return rows;
}

export async function getAuditEntryById(pool: Pool, id: string): Promise<AuditRow | null> {
  if (!/^[a-z0-9]{20,36}$/i.test(id.trim())) return null;
  const { rows } = await pool.query<AuditRow>(
    `SELECT id, "createdAt", "adminLogin", action, metadata
     FROM "AdminAuditLog" WHERE id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export function formatAuditListLine(r: AuditRow, maxLen: number): string {
  const iso = r.createdAt.toISOString().replace('T', ' ').slice(0, 19);
  const base = `${iso}  ${r.adminLogin}  ${r.action}`;
  if (base.length <= maxLen) return base;
  return `${base.slice(0, maxLen - 1)}…`;
}

export function formatAuditDetail(r: AuditRow, maxBody: number): string {
  let metaStr = '(no metadata)';
  if (r.metadata != null) {
    try {
      metaStr = JSON.stringify(r.metadata, null, 2);
    } catch {
      metaStr = String(r.metadata);
    }
  }
  const head = [
    'Audit entry',
    `id: ${r.id}`,
    `time: ${r.createdAt.toISOString()}`,
    `admin: ${r.adminLogin}`,
    `action: ${r.action}`,
    '',
    'metadata:',
  ].join('\n');
  const rest = truncateBlock(metaStr, Math.max(400, maxBody - head.length - 24));
  return `${head}\n${rest}`;
}

function truncateBlock(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
