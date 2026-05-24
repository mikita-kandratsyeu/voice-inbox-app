import { ADMIN_COOKIE_NAME } from '@/config/constants';
import { ADMIN_BOT_ID_HEADER, ADMIN_BOT_TRUST_HEADER } from '@/lib/admin-bot-auth';
import { verifyAdminSessionToken } from '@/lib/admin-jwt';
import {
  getAdminAccessProfileFromCookie,
  type AdminAccessProfile,
} from '@/lib/admin-access-profile';
import { normalizeAdminPermissions } from '@/lib/admin-permissions';
import { prisma } from '@/lib/prisma';
import { cookies, headers } from 'next/headers';

export type { AdminAccessProfile } from '@/lib/admin-access-profile';

export async function isAdminCookieValid(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) {
    return false;
  }

  const session = await verifyAdminSessionToken(cookieValue);
  return session !== null;
}

export async function isAdminPageSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  return isAdminCookieValid(value);
}

async function getAdminAccessProfileFromBotTrustHeaders(): Promise<AdminAccessProfile | null> {
  const h = await headers();
  if (h.get(ADMIN_BOT_TRUST_HEADER) !== '1') return null;
  const adminId = h.get(ADMIN_BOT_ID_HEADER)?.trim();
  if (!adminId || !process.env.DATABASE_URL?.trim()) return null;

  try {
    const user = await prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { id: true, login: true, isSuperadmin: true, permissions: true },
    });
    if (!user) return null;
    return {
      adminId: user.id,
      login: user.login,
      isSuperadmin: user.isSuperadmin,
      permissions: normalizeAdminPermissions(user.permissions),
    };
  } catch {
    return null;
  }
}

/** Cookie session or Telegram bot trust headers (set by proxy after bot API auth). */
export async function getAdminAccessProfileFromRequestCookie(): Promise<AdminAccessProfile | null> {
  const fromBot = await getAdminAccessProfileFromBotTrustHeaders();
  if (fromBot) return fromBot;
  const cookieStore = await cookies();
  return getAdminAccessProfileFromCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
}
