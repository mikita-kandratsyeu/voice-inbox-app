import { NextResponse } from 'next/server';

import {
  ADMIN_LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
  ADMIN_LOGIN_RATE_LIMIT_WINDOW_SECONDS,
} from '@/config/constants';
import { getAdminCookieMaxAgeSeconds } from '@/lib/admin-cookie-max-age';
import { getAdminSession } from '@/lib/admin-session';

export async function GET(): Promise<NextResponse> {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const raw = process.env.ADMIN_ALLOWED_IPS?.trim();
  const list = raw
    ? raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return NextResponse.json({
    ok: true,
    ipAllowlistEnabled: list.length > 0,
    ipAllowlistCount: list.length,
    adminLoginRateLimit: {
      windowSeconds: ADMIN_LOGIN_RATE_LIMIT_WINDOW_SECONDS,
      maxAttempts: ADMIN_LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
    },
    sessionCookieMaxAgeSeconds: getAdminCookieMaxAgeSeconds(),
    adminJwtExpiresInEnv: process.env.ADMIN_JWT_EXPIRES_IN?.trim() || '24h (default)',
    cookieHttpOnly: true,
    cookieSameSite: 'lax' as const,
    cookieSecureInProduction: process.env.NODE_ENV === 'production',
  });
}
