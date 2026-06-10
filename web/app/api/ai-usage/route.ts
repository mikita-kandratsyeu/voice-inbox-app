import { getBonusConfig } from '@/lib/app-config';
import { getUsage } from '@/lib/ai-rate-limit';
import { assertMobileAuthenticatedDevice } from '@/lib/mobile-api-guard';
import { NextResponse } from 'next/server';

export const GET = async (request: Request): Promise<NextResponse> => {
  const gate = await assertMobileAuthenticatedDevice(request);
  if (!gate.ok) {
    return gate.response;
  }

  const [usage, bonus] = await Promise.all([getUsage(gate.deviceId), getBonusConfig()]);

  return NextResponse.json({
    ...usage,
    bonusAmount: bonus.amount,
  });
};
