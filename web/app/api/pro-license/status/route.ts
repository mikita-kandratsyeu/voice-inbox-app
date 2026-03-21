import {
  apiError,
  checkDeviceRateLimit,
  HttpStatus,
  requireAppAuth,
  requireMobileUserAgent,
  validateDeviceId,
} from '@/lib/api';
import { HEADER_DEVICE_ID } from '@/config/constants';
import { getAiWeeklyLimits } from '@/lib/app-config';
import { getProExpiresAtUtc, isProDevice } from '@/lib/pro-entitlement';
import { NextResponse } from 'next/server';

export const GET = async (request: Request): Promise<NextResponse> => {
  const path = new URL(request.url).pathname;
  const authError = await requireAppAuth();
  if (authError) return authError;

  const uaError = await requireMobileUserAgent();
  if (uaError) return uaError;

  const deviceId = request.headers.get(HEADER_DEVICE_ID);
  const deviceIdError = validateDeviceId(deviceId);
  if (deviceIdError) {
    return apiError(deviceIdError, HttpStatus.BAD_REQUEST, { pathname: path });
  }
  const deviceIdTrimmed = deviceId!.trim();

  const rateLimitError = await checkDeviceRateLimit(deviceIdTrimmed);
  if (rateLimitError) return rateLimitError;

  const [active, expiresAt, limits] = await Promise.all([
    isProDevice(deviceIdTrimmed),
    getProExpiresAtUtc(deviceIdTrimmed),
    getAiWeeklyLimits(),
  ]);

  return NextResponse.json({
    active,
    expiresAt: active && expiresAt ? expiresAt.toISOString() : null,
    weeklyLimitFree: limits.freeWeeklyLimit,
    weeklyLimitPro: limits.proWeeklyLimit,
  });
};
