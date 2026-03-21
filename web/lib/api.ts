import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  ALLOWED_AI_MODELS,
  HEADER_DEVICE_ID,
  PRO_LICENSE_REDEEM_KEY_PREFIX,
  PRO_LICENSE_REDEEM_MAX_ATTEMPTS,
  PRO_LICENSE_REDEEM_WINDOW_SECONDS,
  RATE_LIMIT_DEVICE_KEY_PREFIX,
  RATE_LIMIT_DEVICE_MAX_REQUESTS,
  RATE_LIMIT_DEVICE_WINDOW_SECONDS,
  SUPPORT_RATE_LIMIT_KEY_PREFIX,
  SUPPORT_RATE_LIMIT_MAX_REQUESTS,
  SUPPORT_RATE_LIMIT_WINDOW_SECONDS,
} from '@/config/constants';
import { recordApiError } from '@/lib/api-telemetry';
import { verifyAppToken } from '@/lib/jwt';
import { redis } from '@/lib/redis';

export const HttpStatus = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
} as const;

const MOBILE_USER_AGENT_SUBSTRING = process.env.MOBILE_USER_AGENT?.trim() ?? '';

export function validateAllowedModel(model: string): string | null {
  const trimmed = typeof model === 'string' ? model.trim() : '';
  if (!trimmed) return 'model is required';
  if (!ALLOWED_AI_MODELS.includes(trimmed)) {
    return `model must be one of: ${ALLOWED_AI_MODELS.join(', ')}`;
  }
  return null;
}

export async function requireMobileUserAgent(): Promise<NextResponse | null> {
  if (!MOBILE_USER_AGENT_SUBSTRING) return null;
  const headersList = await headers();
  const ua = headersList.get('user-agent') ?? '';
  if (!ua.includes(MOBILE_USER_AGENT_SUBSTRING)) {
    return apiError('Forbidden', HttpStatus.FORBIDDEN);
  }
  return null;
}

export async function checkDeviceRateLimit(deviceId: string): Promise<NextResponse | null> {
  const window = Math.floor(Date.now() / 1000 / RATE_LIMIT_DEVICE_WINDOW_SECONDS);
  const key = `${RATE_LIMIT_DEVICE_KEY_PREFIX}${deviceId}:${window}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, RATE_LIMIT_DEVICE_WINDOW_SECONDS);
  }
  if (count > RATE_LIMIT_DEVICE_MAX_REQUESTS) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: HttpStatus.TOO_MANY_REQUESTS,
        headers: { 'Retry-After': String(RATE_LIMIT_DEVICE_WINDOW_SECONDS) },
      },
    );
  }
  return null;
}

export async function checkProLicenseRedeemRateLimit(
  deviceId: string,
): Promise<NextResponse | null> {
  const window = Math.floor(Date.now() / 1000 / PRO_LICENSE_REDEEM_WINDOW_SECONDS);
  const key = `${PRO_LICENSE_REDEEM_KEY_PREFIX}${deviceId}:${window}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, PRO_LICENSE_REDEEM_WINDOW_SECONDS);
  }
  if (count > PRO_LICENSE_REDEEM_MAX_ATTEMPTS) {
    return NextResponse.json(
      {
        error: 'Too many activation attempts. Try again later.',
        code: 'rate_limit',
      },
      {
        status: HttpStatus.TOO_MANY_REQUESTS,
        headers: { 'Retry-After': String(PRO_LICENSE_REDEEM_WINDOW_SECONDS) },
      },
    );
  }
  return null;
}

export async function checkSupportRateLimit(deviceId: string): Promise<NextResponse | null> {
  const window = Math.floor(Date.now() / 1000 / SUPPORT_RATE_LIMIT_WINDOW_SECONDS);
  const key = `${SUPPORT_RATE_LIMIT_KEY_PREFIX}${deviceId}:${window}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, SUPPORT_RATE_LIMIT_WINDOW_SECONDS);
  }
  if (count > SUPPORT_RATE_LIMIT_MAX_REQUESTS) {
    return NextResponse.json(
      { error: 'Too many support requests. Try again later.' },
      {
        status: HttpStatus.TOO_MANY_REQUESTS,
        headers: { 'Retry-After': String(SUPPORT_RATE_LIMIT_WINDOW_SECONDS) },
      },
    );
  }
  return null;
}

export function apiError(
  message: string,
  status: number = HttpStatus.BAD_REQUEST,
  opts?: { pathname?: string },
) {
  if (opts?.pathname && status >= 400) {
    void recordApiError(opts.pathname, status);
  }
  return NextResponse.json({ error: message }, { status });
}

export function validateRequiredString(value: unknown, fieldName: string): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return `${fieldName} is required`;
  }

  return null;
}

export function validateRequiredStrings(
  fields: Array<{ value: unknown; name: string }>,
): string | null {
  for (const { value, name } of fields) {
    const error = validateRequiredString(value, name);

    if (error) {
      return error;
    }
  }

  return null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ANDROID_ID_REGEX = /^[0-9a-f]{16}$/i;

export function isValidDeviceId(deviceId: string): boolean {
  const trimmed = deviceId.trim();

  if (trimmed.length < 16 || trimmed.length > 36) {
    return false;
  }

  return UUID_REGEX.test(trimmed) || ANDROID_ID_REGEX.test(trimmed);
}

export function validateDeviceId(deviceId: string | null | undefined): string | null {
  if (!deviceId || typeof deviceId !== 'string') {
    return 'x-device-id header is required';
  }

  const trimmed = deviceId.trim();
  if (!trimmed) {
    return 'x-device-id header is required';
  }

  if (!isValidDeviceId(trimmed)) {
    return 'Invalid x-device-id format (expected UUID or 16-char hex)';
  }

  return null;
}

export async function parseJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export function getAppSecret(): string | null {
  const secret = process.env.APP_SECRET?.trim();
  return secret || null;
}

export function requireAppSecretForToken(request: Request): NextResponse | null {
  const secret = request.headers.get('x-app-secret')?.trim();
  if (!secret) {
    return apiError('Unauthorized', HttpStatus.UNAUTHORIZED);
  }
  const accepted = getAppSecret();
  if (!accepted) {
    return apiError('Server misconfiguration', HttpStatus.UNAUTHORIZED);
  }
  if (secret !== accepted) {
    return apiError('Unauthorized', HttpStatus.UNAUTHORIZED);
  }
  return null;
}

export async function requireAppAuth(): Promise<NextResponse | null> {
  const headersList = await headers();
  const authHeader = headersList.get('authorization')?.trim();
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!bearer) {
    return apiError('Unauthorized', HttpStatus.UNAUTHORIZED);
  }

  const payload = await verifyAppToken(bearer);
  if (!payload) {
    return apiError('Unauthorized', HttpStatus.UNAUTHORIZED);
  }

  const headerDeviceId = headersList.get(HEADER_DEVICE_ID)?.trim();
  if (!headerDeviceId || headerDeviceId !== payload.deviceId) {
    return apiError('Forbidden', HttpStatus.FORBIDDEN);
  }

  return null;
}
