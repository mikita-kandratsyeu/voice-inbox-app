import { ADMIN_COOKIE_NAME } from '@/config/constants';
import { verifyAdminSessionToken } from '@/lib/admin-jwt';
import {
  getAdminAccessProfileFromCookie,
  type AdminAccessProfile,
} from '@/lib/admin-access-profile';
import { cookies } from 'next/headers';

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

export async function getAdminAccessProfileFromRequestCookie(): Promise<AdminAccessProfile | null> {
  const cookieStore = await cookies();
  return getAdminAccessProfileFromCookie(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
}
