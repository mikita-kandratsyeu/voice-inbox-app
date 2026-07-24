import { NextResponse } from 'next/server';

import { HEADER_DEVICE_ID } from '@/config/constants';
import {
  apiError,
  checkDeviceRateLimit,
  HttpStatus,
  requireAppAuth,
  requireMobileUserAgent,
  validateDeviceId,
} from '@/lib/api';
import type { ApiErrorCodeValue } from '@/lib/api-error-codes';

export type AssertMobileDeviceResult =
  | { ok: true; deviceId: string; pathname: string }
  | { ok: false; response: NextResponse };

export type MobileApiGuardOptions = {
  pathname?: string;
  invalidDeviceIdCode?: ApiErrorCodeValue;
};

function resolveGuardOptions(
  request: Request,
  pathnameOrOptions?: string | MobileApiGuardOptions,
): { pathname: string; invalidDeviceIdCode?: ApiErrorCodeValue } {
  if (typeof pathnameOrOptions === 'string') {
    return { pathname: pathnameOrOptions };
  }

  return {
    pathname: pathnameOrOptions?.pathname ?? new URL(request.url).pathname,
    invalidDeviceIdCode: pathnameOrOptions?.invalidDeviceIdCode,
  };
}

/**
 * Mobile API guard chain (post-auth): app JWT → mobile User-Agent → `x-device-id` → per-device rate limit.
 */
export async function assertMobileAuthenticatedDevice(
  request: Request,
  pathnameOrOptions?: string | MobileApiGuardOptions,
): Promise<AssertMobileDeviceResult> {
  const { pathname, invalidDeviceIdCode } = resolveGuardOptions(request, pathnameOrOptions);

  const authError = await requireAppAuth();
  if (authError) {
    return { ok: false, response: authError };
  }

  const uaError = await requireMobileUserAgent();
  if (uaError) {
    return { ok: false, response: uaError };
  }

  const deviceId = request.headers.get(HEADER_DEVICE_ID);
  const deviceIdError = validateDeviceId(deviceId);
  if (deviceIdError) {
    return {
      ok: false,
      response: apiError(deviceIdError, HttpStatus.BAD_REQUEST, {
        pathname,
        ...(invalidDeviceIdCode ? { code: invalidDeviceIdCode } : {}),
      }),
    };
  }

  const deviceIdTrimmed = deviceId!.trim();
  const rateLimitError = await checkDeviceRateLimit(deviceIdTrimmed, { pathname });
  if (rateLimitError) {
    return { ok: false, response: rateLimitError };
  }

  return { ok: true, deviceId: deviceIdTrimmed, pathname };
}

/** `POST /api/token`: App Check → mobile User-Agent → `x-device-id` (token route keeps its own rate limit). */
export async function assertMobileTokenExchange(
  request: Request,
): Promise<AssertMobileDeviceResult> {
  const pathname = new URL(request.url).pathname;

  const { requireAppCheckForToken } = await import('@/lib/firebase-app-check');
  const appCheckError = await requireAppCheckForToken(request);
  if (appCheckError) {
    return { ok: false, response: appCheckError };
  }

  const uaError = await requireMobileUserAgent();
  if (uaError) {
    return { ok: false, response: uaError };
  }

  const deviceId = request.headers.get(HEADER_DEVICE_ID);
  const deviceIdError = validateDeviceId(deviceId);
  if (deviceIdError) {
    return {
      ok: false,
      response: apiError(deviceIdError, HttpStatus.BAD_REQUEST, { pathname }),
    };
  }

  return { ok: true, deviceId: deviceId!.trim(), pathname };
}
