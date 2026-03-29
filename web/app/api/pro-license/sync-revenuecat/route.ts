import {
  apiError,
  checkDeviceRateLimit,
  HttpStatus,
  requireAppAuth,
  requireMobileUserAgent,
  validateDeviceId,
} from '@/lib/api';
import { HEADER_DEVICE_ID } from '@/config/constants';
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
      return NextResponse.json(
        { error: 'server_not_configured', code: result.reason },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'sync_failed', code: result.reason }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
};
