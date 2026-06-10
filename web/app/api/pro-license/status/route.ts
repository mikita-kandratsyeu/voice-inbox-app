import { getAiWeeklyLimits } from '@/lib/app-config';
import { assertMobileAuthenticatedDevice } from '@/lib/mobile-api-guard';
import { getProExpiresAtUtc, isProDevice } from '@/lib/pro-entitlement';
import { NextResponse } from 'next/server';

export const GET = async (request: Request): Promise<NextResponse> => {
  const gate = await assertMobileAuthenticatedDevice(request);
  if (!gate.ok) {
    return gate.response;
  }

  const [active, expiresAt, limits] = await Promise.all([
    isProDevice(gate.deviceId),
    getProExpiresAtUtc(gate.deviceId),
    getAiWeeklyLimits(),
  ]);

  return NextResponse.json({
    active,
    expiresAt: active && expiresAt ? expiresAt.toISOString() : null,
    weeklyLimitFree: limits.freeWeeklyLimit,
    weeklyLimitPro: limits.proWeeklyLimit,
  });
};
