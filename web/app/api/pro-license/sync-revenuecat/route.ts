import { HEADER_DEVICE_ID } from '@/config/constants';
import {
  apiError,
  checkDeviceRateLimit,
  HttpStatus,
  requireAppAuth,
  requireMobileUserAgent,
  validateDeviceId,
} from '@/lib/api';
import { syncDeviceProEntitlementFromRevenueCatRest } from '@/lib/revenuecat-rest-sync';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

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

  const result = await syncDeviceProEntitlementFromRevenueCatRest(deviceIdTrimmed);

  if (!result.ok) {
    if (result.reason === 'revenuecat_secret_not_configured') {
      return apiError('server_not_configured', HttpStatus.SERVICE_UNAVAILABLE, {
        pathname: path,
        code: result.reason,
      });
    }
    return apiError('sync_failed', 502, { pathname: path, code: result.reason });
  }

  return NextResponse.json({ ok: true });
};
