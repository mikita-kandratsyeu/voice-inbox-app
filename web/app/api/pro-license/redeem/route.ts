import { HEADER_DEVICE_ID } from '@/config/constants';
import {
  apiError,
  checkDeviceRateLimit,
  checkProLicenseRedeemRateLimit,
  HttpStatus,
  parseJsonBody,
  requireAppAuth,
  requireMobileUserAgent,
  validateDeviceId,
} from '@/lib/api';
import { getAiWeeklyLimits } from '@/lib/app-config';
import { redeemProLicenseKey } from '@/lib/pro-license-redeem';
import { NextResponse } from 'next/server';

type Body = { key?: unknown };

export const POST = async (request: Request): Promise<NextResponse> => {
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

  const redeemRl = await checkProLicenseRedeemRateLimit(deviceIdTrimmed);
  if (redeemRl) return redeemRl;

  const body = await parseJsonBody<Body>(request);
  if (!body || typeof body.key !== 'string') {
    return apiError('key is required', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const { proWeeklyLimit } = await getAiWeeklyLimits();
  const result = await redeemProLicenseKey(body.key, deviceIdTrimmed, proWeeklyLimit);

  if (!result.ok) {
    return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
  }

  return NextResponse.json({
    expiresAt: result.expiresAt,
    weeklyLimitPro: result.weeklyLimitPro,
  });
};
