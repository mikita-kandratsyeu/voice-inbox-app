import type { Pool } from 'pg';

export const PRO_KEYS_PAGE_SIZE = 5 as const;

export type ProKeyRow = {
  id: string;
  keyHash: string;
  durationMonths: number;
  durationDays: number | null;
  createdAt: Date;
  createdByAdminId: string;
  issuedToEmail: string | null;
  consumedAt: Date | null;
  consumedByDeviceId: string | null;
};

export async function listProLicenseKeysPage(pool: Pool, page: number): Promise<ProKeyRow[]> {
  const offset = Math.max(0, page) * PRO_KEYS_PAGE_SIZE;
  const { rows } = await pool.query<ProKeyRow>(
    `SELECT id, "keyHash", "durationMonths", "durationDays", "createdAt", "createdByAdminId",
            "issuedToEmail", "consumedAt", "consumedByDeviceId"
     FROM "ProLicenseKey"
     ORDER BY "createdAt" DESC
     LIMIT $1 OFFSET $2`,
    [PRO_KEYS_PAGE_SIZE + 1, offset],
  );
  return rows;
}

export async function getProLicenseKeyById(pool: Pool, id: string): Promise<ProKeyRow | null> {
  if (!/^[a-z0-9]{20,36}$/i.test(id.trim())) return null;
  const { rows } = await pool.query<ProKeyRow>(
    `SELECT id, "keyHash", "durationMonths", "durationDays", "createdAt", "createdByAdminId",
            "issuedToEmail", "consumedAt", "consumedByDeviceId"
     FROM "ProLicenseKey" WHERE id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

/** Short hash prefix for correlation only (not the secret key). */
export function hashPrefix(keyHash: string, len = 10): string {
  const t = keyHash.trim();
  if (t.length <= len) return t;
  return `${t.slice(0, len)}…`;
}

export function formatProKeyLine(r: ProKeyRow, maxLen: number): string {
  const iso = r.createdAt.toISOString().slice(0, 10);
  const days = r.durationDays != null ? `+${r.durationDays}d` : '';
  const email = (r.issuedToEmail || '-').replace(/\s+/g, ' ').trim();
  const state = r.consumedAt ? 'used' : 'open';
  const base = `${iso}  ${r.durationMonths}m${days}  ${email}  ${state}  ${hashPrefix(r.keyHash, 8)}`;
  if (base.length <= maxLen) return base;
  return `${base.slice(0, maxLen - 1)}…`;
}

export function formatProKeyDetail(r: ProKeyRow, maxLen: number): string {
  const lines = [
    'Pro license key (read-only)',
    `id: ${r.id}`,
    `created: ${r.createdAt.toISOString()}`,
    `duration: ${r.durationMonths} months${r.durationDays != null ? ` + ${r.durationDays} days` : ''}`,
    `createdByAdminId: ${r.createdByAdminId}`,
    `issuedToEmail: ${r.issuedToEmail ?? '(none)'}`,
    `consumedAt: ${r.consumedAt?.toISOString() ?? '(not consumed)'}`,
    `consumedByDeviceId: ${r.consumedByDeviceId ?? '(n/a)'}`,
    '',
    `keyHash prefix (not the redeemable key): ${hashPrefix(r.keyHash, 16)}`,
  ];
  return truncateBlock(lines.join('\n'), maxLen);
}

function truncateBlock(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
