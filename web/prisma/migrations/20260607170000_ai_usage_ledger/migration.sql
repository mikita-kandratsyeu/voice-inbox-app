CREATE TABLE "AiUsageLedgerEntry" (
  "id" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "kind" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "jobId" TEXT,
  "description" TEXT,
  "metadata" JSONB,

  CONSTRAINT "AiUsageLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiUsageLedgerEntry_deviceId_createdAt_id_idx"
  ON "AiUsageLedgerEntry"("deviceId", "createdAt" DESC, "id" DESC);

CREATE INDEX "AiUsageLedgerEntry_jobId_idx"
  ON "AiUsageLedgerEntry"("jobId");
