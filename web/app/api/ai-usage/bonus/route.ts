import { ApiErrorCode } from '@/lib/api-error-codes';
import { apiError, HttpStatus } from '@/lib/api';
import { getBonusConfig } from '@/lib/app-config';
import { addBonus, getUsage } from '@/lib/ai-rate-limit';
import { assertMobileAuthenticatedDevice } from '@/lib/mobile-api-guard';
import { redis } from '@/lib/redis';
import { NextResponse } from 'next/server';

export const POST = async (request: Request): Promise<NextResponse> => {
  const gate = await assertMobileAuthenticatedDevice(request);
  if (!gate.ok) {
    return gate.response;
  }

  const deviceIdTrimmed = gate.deviceId;
  const path = gate.pathname;

  const usageBefore = await getUsage(deviceIdTrimmed);
  if (usageBefore.used <= 0) {
    return apiError('bonus_no_usage', HttpStatus.BAD_REQUEST, {
      pathname: path,
      code: ApiErrorCode.BonusNoUsage,
    });
  }

  const bonus = await getBonusConfig();
  const cooldownKey = `${bonus.cooldownKeyPrefix}${deviceIdTrimmed}`;
  const inCooldown = await redis.get(cooldownKey);
  if (inCooldown) {
    const res = apiError('Bonus claim is on cooldown', HttpStatus.TOO_MANY_REQUESTS, {
      pathname: path,
      code: ApiErrorCode.BonusCooldown,
    });
    res.headers.set('Retry-After', String(bonus.cooldownSeconds));
    return res;
  }

  await addBonus(deviceIdTrimmed, bonus.amount, {
    operation: 'bonus',
    description: 'Rewarded ad bonus',
    metadata: { requestedAmount: bonus.amount },
  });
  await redis.set(cooldownKey, '1', { ex: bonus.cooldownSeconds });

  const usage = await getUsage(deviceIdTrimmed);
  return NextResponse.json({
    ...usage,
    bonusAmount: bonus.amount,
    bonusCooldownSeconds: bonus.cooldownSeconds,
  });
};
