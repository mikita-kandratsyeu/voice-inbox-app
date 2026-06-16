CREATE TABLE "PublishedNote" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "markdown" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishedNote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublishedNote_token_key" ON "PublishedNote"("token");
CREATE UNIQUE INDEX "PublishedNote_deviceId_recordId_key" ON "PublishedNote"("deviceId", "recordId");
CREATE INDEX "PublishedNote_token_revokedAt_idx" ON "PublishedNote"("token", "revokedAt");
CREATE INDEX "PublishedNote_expiresAt_idx" ON "PublishedNote"("expiresAt");
