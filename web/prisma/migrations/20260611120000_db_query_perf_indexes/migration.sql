-- Query-performance indexes (admin lists, pro filters, AI ledger patches).

-- CreateIndex
CREATE INDEX "SupportIssue_status_createdAt_idx" ON "SupportIssue"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ProLicenseKey_consumedByDeviceId_idx" ON "ProLicenseKey"("consumedByDeviceId");

-- CreateIndex
CREATE INDEX "ProLicenseKey_consumedAt_idx" ON "ProLicenseKey"("consumedAt" DESC);

-- CreateIndex
CREATE INDEX "DeviceProEntitlement_expiresAt_idx" ON "DeviceProEntitlement"("expiresAt");

-- CreateIndex
CREATE INDEX "AiUsageLedgerEntry_deviceId_operation_jobId_idx" ON "AiUsageLedgerEntry"("deviceId", "operation", "jobId");

-- Partial index: unused license keys (admin filter status=unused).
CREATE INDEX "ProLicenseKey_unused_createdAt_idx"
  ON "ProLicenseKey"("createdAt" DESC)
  WHERE "consumedAt" IS NULL;
