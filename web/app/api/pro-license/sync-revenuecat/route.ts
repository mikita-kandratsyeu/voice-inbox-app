import { apiError, HttpStatus } from '@/lib/api';
import { assertMobileAuthenticatedDevice } from '@/lib/mobile-api-guard';
import { syncDeviceProEntitlementFromRevenueCatRest } from '@/lib/revenuecat-rest-sync';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export const POST = async (request: Request): Promise<NextResponse> => {
  const gate = await assertMobileAuthenticatedDevice(request);
  if (!gate.ok) {
    return gate.response;
  }

  const result = await syncDeviceProEntitlementFromRevenueCatRest(gate.deviceId);

  if (!result.ok) {
    if (result.reason === 'revenuecat_secret_not_configured') {
      return apiError('server_not_configured', HttpStatus.SERVICE_UNAVAILABLE, {
        pathname: gate.pathname,
        code: result.reason,
      });
    }
    return apiError('sync_failed', 502, { pathname: gate.pathname, code: result.reason });
  }

  return NextResponse.json({ ok: true });
};
