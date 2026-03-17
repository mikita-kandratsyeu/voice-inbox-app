import {
  apiError,
  checkDeviceRateLimit,
  HttpStatus,
  requireAppSecret,
  requireMobileUserAgent,
  validateDeviceId,
} from '@/lib/api';
import { clearAppForeground } from '@/lib/push-tokens';
import { HEADER_DEVICE_ID } from '@/config/constants';
import { NextResponse } from 'next/server';

export const POST = async (request: Request): Promise<NextResponse> => {
  const authError = requireAppSecret(request);
  if (authError) return authError;

  const uaError = requireMobileUserAgent(request);
  if (uaError) return uaError;

  const deviceId = request.headers.get(HEADER_DEVICE_ID);
  const deviceIdError = validateDeviceId(deviceId);
  if (deviceIdError) {
    return apiError(deviceIdError, HttpStatus.BAD_REQUEST);
  }
  const deviceIdTrimmed = deviceId!.trim();

  const rateLimitError = await checkDeviceRateLimit(deviceIdTrimmed);
  if (rateLimitError) return rateLimitError;

  await clearAppForeground(deviceIdTrimmed);

  return NextResponse.json({ ok: true });
};
