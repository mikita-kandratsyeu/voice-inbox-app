-- Link Telegram user id to admin account for bot RBAC
ALTER TABLE "AdminUser" ADD COLUMN "telegramUserId" TEXT;

CREATE UNIQUE INDEX "AdminUser_telegramUserId_key" ON "AdminUser"("telegramUserId");
