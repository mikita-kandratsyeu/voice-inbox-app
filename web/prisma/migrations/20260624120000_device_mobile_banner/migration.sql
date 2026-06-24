CREATE TABLE "DeviceMobileBanner" (
    "deviceId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "bannerJson" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceMobileBanner_pkey" PRIMARY KEY ("deviceId")
);

CREATE INDEX "DeviceMobileBanner_updatedAt_idx" ON "DeviceMobileBanner"("updatedAt" DESC);
