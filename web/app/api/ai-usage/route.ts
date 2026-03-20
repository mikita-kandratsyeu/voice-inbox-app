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
import { getUsage } from '@/lib/ai-rate-limit';
import { NextResponse } from 'next/server';

export const GET = async (request: Request): Promise<NextResponse> => {
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

  const [usage, bonus] = await Promise.all([getUsage(deviceIdTrimmed), getBonusConfig()]);

  return NextResponse.json({
    ...usage,
    bonusAmount: bonus.amount,
  });
};
