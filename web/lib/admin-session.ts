import { cookies } from 'next/headers';

import { ADMIN_COOKIE_NAME } from '@/config/constants';
import { verifyAdminSessionToken } from '@/lib/admin-jwt';

export type AdminSession = { adminId: string; login: string };

export async function getAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminSessionToken(token);
}
