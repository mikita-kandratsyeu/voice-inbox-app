import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { redis } from '@/lib/redis';
import { routing } from '@/lib/i18n';

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 15;
const RATE_LIMIT_KEY_PREFIX = 'rl:';

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');

  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }

  return 'unknown';
}

function getRateLimitKey(ip: string): string {
  const window = Math.floor(Date.now() / 1000 / RATE_LIMIT_WINDOW_SECONDS);

  return `${RATE_LIMIT_KEY_PREFIX}${ip}:${window}`;
}

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (request.method === 'POST' && request.nextUrl.pathname === '/api/messages') {
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
}

export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)', '/api/messages'],
};
