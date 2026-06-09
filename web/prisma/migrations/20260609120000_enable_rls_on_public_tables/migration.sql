-- Supabase exposes the `public` schema via PostgREST (anon / authenticated roles).
-- This app uses Prisma with the postgres role only — not supabase-js or the Data API.
--
-- Safe for Prisma / yarn db:push / migrations:
--   • ENABLE ROW LEVEL SECURITY (without FORCE) — superuser `postgres` bypasses RLS.
--   • No policies — anon/authenticated see zero rows via Data API.
--   • REVOKE only targets anon + authenticated, not postgres.
--
-- Verify after apply: yarn db:verify-rls

ALTER TABLE "AdminUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminBudgetExpense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiUsageLedgerEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiUsageResetPurchase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AppConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BroadcastHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeviceProEntitlement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProLicenseKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReleasePost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupportIssue" ENABLE ROW LEVEL SECURITY;

-- Defense in depth: strip default grants from Supabase API roles.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
