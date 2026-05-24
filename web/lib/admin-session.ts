import { cookies, headers } from 'next/headers';

import { ADMIN_COOKIE_NAME } from '@/config/constants';
import {
  ADMIN_BOT_ID_HEADER,
  ADMIN_BOT_LOGIN_HEADER,
  ADMIN_BOT_TRUST_HEADER,
} from '@/lib/admin-bot-auth';
import { verifyAdminSessionToken } from '@/lib/admin-jwt';

export type AdminSession = { adminId: string; login: string };

export async function getAdminSession(): Promise<AdminSession | null> {
  const h = await headers();
  if (h.get(ADMIN_BOT_TRUST_HEADER) === '1') {
    const adminId = h.get(ADMIN_BOT_ID_HEADER)?.trim();
    const login = h.get(ADMIN_BOT_LOGIN_HEADER)?.trim();
    if (adminId && login) {
      return { adminId, login };
    }
  }

  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminSessionToken(token);
}
