-- AlterTable
ALTER TABLE "SupportIssue" ADD COLUMN "referenceNumber" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SupportIssue_referenceNumber_key" ON "SupportIssue"("referenceNumber");
