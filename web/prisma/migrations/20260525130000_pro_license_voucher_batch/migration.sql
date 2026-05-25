-- AlterTable
ALTER TABLE "ProLicenseKey" ADD COLUMN "voucherBatchId" TEXT,
ADD COLUMN "voucherTemplateVersion" TEXT;

-- CreateIndex
CREATE INDEX "ProLicenseKey_voucherBatchId_idx" ON "ProLicenseKey"("voucherBatchId");
