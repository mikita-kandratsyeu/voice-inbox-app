import type { Pool } from 'pg';

export type DashboardSnapshot = {
  openSupport: number;
  unconsumedProKeys: number;
  recentBroadcasts: number;
};

export async function getDashboardSnapshot(pool: Pool): Promise<DashboardSnapshot> {
  const [open, keys, bc] = await Promise.all([
    pool.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM "SupportIssue" WHERE status = 'open'`),
    pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM "ProLicenseKey" WHERE "consumedAt" IS NULL`,
    ),
    pool.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM "BroadcastHistory"`),
  ]);
  return {
    openSupport: parseInt(open.rows[0]?.c ?? '0', 10) || 0,
    unconsumedProKeys: parseInt(keys.rows[0]?.c ?? '0', 10) || 0,
    recentBroadcasts: parseInt(bc.rows[0]?.c ?? '0', 10) || 0,
  };
}
