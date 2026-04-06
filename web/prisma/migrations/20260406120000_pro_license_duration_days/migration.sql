-- AlterTable
ALTER TABLE "ProLicenseKey" ADD COLUMN "durationDays" INTEGER;

-- AlterTable
ALTER TABLE "SupportIssue" ADD COLUMN "proLicenseDurationDays" INTEGER;
