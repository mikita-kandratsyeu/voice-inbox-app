-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN "isSuperadmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AdminUser" ADD COLUMN "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Existing admins keep full access (same as before RBAC).
UPDATE "AdminUser" SET "isSuperadmin" = true;
