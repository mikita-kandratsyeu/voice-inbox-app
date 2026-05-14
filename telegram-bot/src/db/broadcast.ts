import type { Pool } from 'pg';

export const BROADCAST_PAGE_SIZE = 5 as const;

export type BroadcastRow = {
  id: string;
  createdAt: Date;
  kind: string;
  notifyType: string;
  title: string | null;
  sent: number;
  failed: number;
  total: number;
};

export async function listBroadcastHistoryPage(pool: Pool, page: number): Promise<BroadcastRow[]> {
  const offset = Math.max(0, page) * BROADCAST_PAGE_SIZE;
  const { rows } = await pool.query<BroadcastRow>(
    `SELECT id, "createdAt", kind, "notifyType", title, sent, failed, total
     FROM "BroadcastHistory"
     ORDER BY "createdAt" DESC
     LIMIT $1 OFFSET $2`,
    [BROADCAST_PAGE_SIZE + 1, offset],
  );
  return rows;
}

export function formatBroadcastLine(r: BroadcastRow, maxLen: number): string {
  const iso = r.createdAt.toISOString().slice(0, 16).replace('T', ' ');
  const t = (r.title || '').replace(/\s+/g, ' ').trim() || '(no title)';
  const base = `${iso}  ${r.kind}/${r.notifyType}  ok ${r.sent}/${r.total}  ${t}`;
  if (base.length <= maxLen) return base;
  return `${base.slice(0, maxLen - 1)}…`;
}
