import { ADMIN_COOKIE_NAME } from '@/config/constants';
import { verifyAdminSessionToken } from '@/lib/admin-jwt';
import { cookies } from 'next/headers';

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
