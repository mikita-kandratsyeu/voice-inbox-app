CREATE TABLE "AiUsageResetPurchase" (
  "id" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "productIdentifier" TEXT NOT NULL,
  "creditedAmount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,

  CONSTRAINT "AiUsageResetPurchase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiUsageResetPurchase_transactionId_key"
  ON "AiUsageResetPurchase"("transactionId");

CREATE INDEX "AiUsageResetPurchase_deviceId_createdAt_idx"
  ON "AiUsageResetPurchase"("deviceId", "createdAt" DESC);
