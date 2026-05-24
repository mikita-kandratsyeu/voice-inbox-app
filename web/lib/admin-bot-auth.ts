import type { AdminAccessProfile } from '@/lib/admin-access-profile';
import { normalizeAdminPermissions } from '@/lib/admin-permissions';
import { prisma } from '@/lib/prisma';
import { isValidTelegramUserIdString } from '@/lib/telegram-admin-whitelist';

const BOT_SECRET_HEADER = 'authorization';
const TELEGRAM_USER_HEADER = 'x-telegram-user-id';

export const ADMIN_BOT_TRUST_HEADER = 'x-admin-bot-trust';
export const ADMIN_BOT_ID_HEADER = 'x-admin-id';
export const ADMIN_BOT_LOGIN_HEADER = 'x-admin-login';

function readBearerSecret(request: Request): string | null {
  const auth = request.headers.get(BOT_SECRET_HEADER)?.trim();
  if (!auth?.toLowerCase().startsWith('bearer ')) return null;
  const token = auth.slice(7).trim();
  return token.length > 0 ? token : null;
}

export function readTelegramUserIdHeader(request: Request): string | null {
  const raw = request.headers.get(TELEGRAM_USER_HEADER)?.trim();
  if (!raw || !isValidTelegramUserIdString(raw)) return null;
  return raw;
}

export function isAdminBotApiConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_API_SECRET?.trim());
}

export function verifyAdminBotApiSecret(request: Request): boolean {
  const expected = process.env.TELEGRAM_BOT_API_SECRET?.trim();
  if (!expected) return false;
  const provided = readBearerSecret(request);
  if (!provided) return false;
  return provided === expected;
}

/** Resolve admin profile when Telegram user id is linked on AdminUser. */
export async function getAdminAccessProfileForTelegramUser(
  telegramUserId: string,
): Promise<AdminAccessProfile | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  if (!isValidTelegramUserIdString(telegramUserId)) return null;

  try {
    const user = await prisma.adminUser.findUnique({
      where: { telegramUserId },
      select: { id: true, login: true, isSuperadmin: true, permissions: true },
    });
    if (!user) return null;
    return {
      adminId: user.id,
      login: user.login,
      isSuperadmin: user.isSuperadmin,
      permissions: normalizeAdminPermissions(user.permissions),
    };
  } catch (e) {
    console.error('[getAdminAccessProfileForTelegramUser]', e);
    return null;
  }
}

/** Bot API auth: valid secret + Telegram id linked to an admin account. */
export async function getAdminAccessProfileFromBotRequest(
  request: Request,
): Promise<AdminAccessProfile | null> {
  if (!verifyAdminBotApiSecret(request)) return null;
  const telegramUserId = readTelegramUserIdHeader(request);
  if (!telegramUserId) return null;
  return getAdminAccessProfileForTelegramUser(telegramUserId);
}

export function stripAdminBotTrustHeaders(headers: Headers): void {
  headers.delete(ADMIN_BOT_TRUST_HEADER);
  headers.delete(ADMIN_BOT_ID_HEADER);
  headers.delete(ADMIN_BOT_LOGIN_HEADER);
}

export function setAdminBotTrustHeaders(headers: Headers, profile: AdminAccessProfile): void {
  headers.set(ADMIN_BOT_TRUST_HEADER, '1');
  headers.set(ADMIN_BOT_ID_HEADER, profile.adminId);
  headers.set(ADMIN_BOT_LOGIN_HEADER, profile.login);
}
