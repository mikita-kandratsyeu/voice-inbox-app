import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  ADMIN_COOKIE_NAME,
  ADMIN_LOGIN_RATE_LIMIT_KEY_PREFIX,
  ADMIN_LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
  ADMIN_LOGIN_RATE_LIMIT_WINDOW_SECONDS,
  RATE_LIMIT_KEY_PREFIX,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_SECONDS,
} from '@/config/constants';
import { resolveAdminApiAccess } from '@/lib/admin-api-access';
import {
  adminAccessRequirementMet,
  getAdminAccessProfileFromCookie,
} from '@/lib/admin-access-profile';
import {
  getAdminAccessProfileFromBotRequest,
  setAdminBotTrustHeaders,
  stripAdminBotTrustHeaders,
} from '@/lib/admin-bot-auth';
import { isAdminCookieValid } from '@/lib/admin-auth';
import { redis } from '@/lib/redis';
import { routing } from '@/lib/i18n';

const getClientIp = (request: NextRequest): string => {
  const forwarded = request.headers.get('x-forwarded-for');

  return forwarded?.split(',')[0]?.trim() ?? 'unknown';
};

const getRateLimitKey = (ip: string): string => {
  const window = Math.floor(Date.now() / 1000 / RATE_LIMIT_WINDOW_SECONDS);
  return `${RATE_LIMIT_KEY_PREFIX}${ip}:${window}`;
};

const getAdminLoginRateLimitKey = (ip: string): string => {
  const window = Math.floor(Date.now() / 1000 / ADMIN_LOGIN_RATE_LIMIT_WINDOW_SECONDS);
  return `${ADMIN_LOGIN_RATE_LIMIT_KEY_PREFIX}${ip}:${window}`;
};

const intlMiddleware = createMiddleware(routing);

export const proxy = async (request: NextRequest): Promise<NextResponse> => {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/admin/')) {
    if (pathname === '/api/admin/login') {
      const ip = getClientIp(request);
      const allowedIps = process.env.ADMIN_ALLOWED_IPS?.trim();
      if (allowedIps) {
        const list = allowedIps
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (list.length > 0 && !list.includes(ip)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
      const loginKey = getAdminLoginRateLimitKey(ip);
      const count = await redis.incr(loginKey);
      if (count === 1) {
        await redis.expire(loginKey, ADMIN_LOGIN_RATE_LIMIT_WINDOW_SECONDS);
      }
      if (count > ADMIN_LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
        return NextResponse.json(
          { error: 'Too many login attempts' },
          {
            status: 429,
            headers: { 'Retry-After': String(ADMIN_LOGIN_RATE_LIMIT_WINDOW_SECONDS) },
          },
        );
      }
    } else if (pathname === '/api/admin/logout') {
      const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
      if (!(await isAdminCookieValid(cookie))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else if (pathname === '/api/admin/bot/me') {
      // Bot auth handled in route handler (secret + Telegram user id).
    } else {
      const requirement = resolveAdminApiAccess(pathname, request.method);
      const forwardedHeaders = new Headers(request.headers);
      stripAdminBotTrustHeaders(forwardedHeaders);

      const botProfile = await getAdminAccessProfileFromBotRequest(request);
      const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
      const profile = botProfile ?? (await getAdminAccessProfileFromCookie(cookie));
      if (!profile) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (!adminAccessRequirementMet(profile, requirement)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (botProfile) {
        setAdminBotTrustHeaders(forwardedHeaders, botProfile);
        return NextResponse.next({ request: { headers: forwardedHeaders } });
      }
    }
    return NextResponse.next();
  }
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return NextResponse.next();
  }

  if (pathname === '/go' || pathname === '/en/go' || pathname === '/ru/go') {
    return NextResponse.next();
  }

  if (request.method === 'POST' && pathname === '/api/messages') {
    const ip = getClientIp(request);
    const key = getRateLimitKey(ip);

    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS);
    }

    if (count > RATE_LIMIT_MAX_REQUESTS) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': String(RATE_LIMIT_WINDOW_SECONDS),
          },
        },
      );
    }

    return NextResponse.next();
  }

  return intlMiddleware(request);
};

export const config = {
  matcher: [
    '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
    '/api/messages',
    '/admin',
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};

export { proxy as middleware };
