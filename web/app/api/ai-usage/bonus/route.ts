import { HEADER_DEVICE_ID } from '@/config/constants';
import { ApiErrorCode } from '@/lib/api-error-codes';
import {
  apiError,
  checkDeviceRateLimit,
  HttpStatus,
  requireAppAuth,
  requireMobileUserAgent,
  validateDeviceId,
} from '@/lib/api';
import { getBonusConfig } from '@/lib/app-config';
import { addBonus, getUsage } from '@/lib/ai-rate-limit';
import { redis } from '@/lib/redis';
import { NextResponse } from 'next/server';

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

  await addBonus(deviceIdTrimmed, bonus.amount);
  await redis.set(cooldownKey, '1', { ex: bonus.cooldownSeconds });

  const usage = await getUsage(deviceIdTrimmed);
  return NextResponse.json({
    ...usage,
    bonusAmount: bonus.amount,
    bonusCooldownSeconds: bonus.cooldownSeconds,
  });
};
