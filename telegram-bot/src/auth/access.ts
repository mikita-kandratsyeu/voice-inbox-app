import type { Pool } from 'pg';

import type { AdminProfile } from '../types.js';
import { type AdminPermission, ADMIN_PERMISSIONS } from './permissions.js';

function normalizePermissions(raw: unknown): AdminPermission[] {
  if (!Array.isArray(raw)) return [];
  const out: AdminPermission[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    if ((ADMIN_PERMISSIONS as readonly string[]).includes(item) && !out.includes(item as AdminPermission)) {
      out.push(item as AdminPermission);
    }
  }
  return out;
}

export async function loadAdminProfile(
  pool: Pool,
  telegramUserId: string,
): Promise<AdminProfile | null> {
  const { rows } = await pool.query<{
    id: string;
    login: string;
    isSuperadmin: boolean;
    permissions: string[];
  }>(
    `SELECT id, login, "isSuperadmin", permissions
     FROM "AdminUser"
     WHERE "telegramUserId" = $1
     LIMIT 1`,
    [telegramUserId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    adminId: row.id,
    login: row.login,
    isSuperadmin: row.isSuperadmin,
    permissions: normalizePermissions(row.permissions),
  };
}
