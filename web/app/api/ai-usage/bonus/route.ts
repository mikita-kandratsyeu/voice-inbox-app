import {
  apiError,
  checkDeviceRateLimit,
  HttpStatus,
  requireAppAuth,
  requireMobileUserAgent,
  validateDeviceId,
} from '@/lib/api';
import { HEADER_DEVICE_ID } from '@/config/constants';
import { getBonusConfig } from '@/lib/app-config';
import { addBonus, getUsage } from '@/lib/ai-rate-limit';
import { redis } from '@/lib/redis';
import { NextResponse } from 'next/server';

export const POST = async (request: Request): Promise<NextResponse> => {
  const authError = await requireAppAuth();
  if (authError) return authError;

  const uaError = await requireMobileUserAgent();
  if (uaError) return uaError;

  const deviceId = request.headers.get(HEADER_DEVICE_ID);
  const deviceIdError = validateDeviceId(deviceId);
  if (deviceIdError) {
    return apiError(deviceIdError, HttpStatus.BAD_REQUEST);
  }
  const deviceIdTrimmed = deviceId!.trim();

  const rateLimitError = await checkDeviceRateLimit(deviceIdTrimmed);
  if (rateLimitError) return rateLimitError;

  const bonus = await getBonusConfig();
  const cooldownKey = `${bonus.cooldownKeyPrefix}${deviceIdTrimmed}`;
  const inCooldown = await redis.get(cooldownKey);
  if (inCooldown) {
    return NextResponse.json(
      { error: 'Bonus claim is on cooldown' },
      {
        status: HttpStatus.TOO_MANY_REQUESTS,
        headers: { 'Retry-After': String(bonus.cooldownSeconds) },
      },
    );
  }

  await addBonus(deviceIdTrimmed, bonus.amount);
  await redis.set(cooldownKey, '1', { ex: bonus.cooldownSeconds });

  const usage = await getUsage(deviceIdTrimmed);
  return NextResponse.json(usage);
};
