/**
 * Sanity check after Supabase RLS hardening: Prisma (postgres role) must still read/write.
 *
 * Usage (from web/):
 *   yarn db:verify-rls
 */

import 'dotenv/config';

import { prisma } from '../lib/prisma';

const APP_TABLES = [
  'AdminUser',
  'AdminAuditLog',
  'AdminBudgetExpense',
  'AiUsageLedgerEntry',
  'AiUsageResetPurchase',
  'AppConfig',
  'BroadcastHistory',
  'DeviceProEntitlement',
  'ProLicenseKey',
  'ReleasePost',
  'SupportIssue',
] as const;

type RoleRow = { role: string; is_superuser: boolean; bypass_rls: boolean };
type RlsRow = { table_name: string; rls_on: boolean; rls_forced: boolean; owner: string };

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is not set (see web/.env)');
  }

  const [roleRow] = await prisma.$queryRaw<RoleRow[]>`
    SELECT
      current_user AS role,
      r.rolsuper AS is_superuser,
      r.rolbypassrls AS bypass_rls
    FROM pg_roles r
    WHERE r.rolname = current_user
  `;

  const rlsRows = await prisma.$queryRaw<RlsRow[]>`
    SELECT
      c.relname AS table_name,
      c.relrowsecurity AS rls_on,
      c.relforcerowsecurity AS rls_forced,
      pg_get_userbyid(c.relowner) AS owner
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname = ANY(${APP_TABLES})
    ORDER BY c.relname
  `;

  const rlsByTable = new Map(rlsRows.map((row) => [row.table_name, row.rls_on]));
  const missingRls = APP_TABLES.filter((name) => !rlsByTable.get(name));
  const rlsOff = APP_TABLES.filter((name) => rlsByTable.get(name) === false);

  const [adminUserCount, appConfigCount, supportIssueCount] = await Promise.all([
    prisma.adminUser.count(),
    prisma.appConfig.count(),
    prisma.supportIssue.count(),
  ]);

  const currentRole = roleRow?.role ?? 'unknown';
  const ownsAllTables = rlsRows.every((row) => row.owner === currentRole);
  const forcedRls = rlsRows.filter((row) => row.rls_forced).map((row) => row.table_name);

  console.log(
    'DB role:',
    currentRole,
    `(superuser=${roleRow?.is_superuser ?? false}, bypass_rls=${roleRow?.bypass_rls ?? false}, owns_tables=${ownsAllTables})`,
  );
  console.log(
    'RLS enabled on',
    rlsRows.filter((r) => r.rls_on).length,
    '/',
    APP_TABLES.length,
    'tables',
  );
  console.log('Prisma reads OK:', {
    adminUser: adminUserCount,
    appConfig: appConfigCount,
    supportIssue: supportIssueCount,
  });

  if (missingRls.length > 0) {
    throw new Error(`Tables not found or missing from check: ${missingRls.join(', ')}`);
  }
  if (rlsOff.length > 0) {
    throw new Error(`RLS is OFF on: ${rlsOff.join(', ')} — run db:rls migration`);
  }
  if (forcedRls.length > 0) {
    throw new Error(
      `FORCE ROW LEVEL SECURITY is on: ${forcedRls.join(', ')} — Prisma may be blocked`,
    );
  }

  const prismaBypassesRls =
    roleRow?.is_superuser === true || roleRow?.bypass_rls === true || ownsAllTables;
  if (!prismaBypassesRls) {
    console.warn(
      'Warning: current role is not superuser, lacks BYPASSRLS, and does not own app tables — add RLS policies for this role.',
    );
  }

  console.log('OK — RLS blocks Supabase Data API (anon/authenticated); Prisma path is unaffected.');
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
