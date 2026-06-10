import { apiError, HttpStatus } from '@/lib/api';
import { assertMobileTokenExchange } from '@/lib/mobile-api-guard';
import { getExpiresInSeconds as getJwtExpiresInSeconds, signAppToken } from '@/lib/jwt';
import { redis } from '@/lib/redis';
import { NextResponse } from 'next/server';

const TOKEN_RATE_LIMIT_KEY_PREFIX = 'rl_token:';
const TOKEN_RATE_LIMIT_WINDOW_SECONDS = 60;
const TOKEN_RATE_LIMIT_MAX_REQUESTS = 20;

export async function POST(request: Request): Promise<NextResponse> {
  const path = new URL(request.url).pathname;
  const gate = await assertMobileTokenExchange(request);
  if (!gate.ok) {
    return gate.response;
  }

  const deviceIdTrimmed = gate.deviceId;

  const rateLimitKey = `${TOKEN_RATE_LIMIT_KEY_PREFIX}${deviceIdTrimmed}`;
  const window = Math.floor(Date.now() / 1000 / TOKEN_RATE_LIMIT_WINDOW_SECONDS);
  const key = `${rateLimitKey}:${window}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, TOKEN_RATE_LIMIT_WINDOW_SECONDS);
  }
  if (count > TOKEN_RATE_LIMIT_MAX_REQUESTS) {
    return NextResponse.json(
      { error: 'Too many token requests' },
      {
        status: HttpStatus.TOO_MANY_REQUESTS,
        headers: { 'Retry-After': String(TOKEN_RATE_LIMIT_WINDOW_SECONDS) },
      },
    );
  }

  try {
    const access_token = await signAppToken(deviceIdTrimmed);
    const expires_in = getJwtExpiresInSeconds();
    return NextResponse.json({ access_token, expires_in });
  } catch (err) {
    if (process.env.NODE_ENV === 'development' && err instanceof Error) {
      console.error('[token] sign error', err.message);
    }
    return apiError('Server misconfiguration', 500, { pathname: path });
  }
}
