import {
  apiError,
  checkDeviceRateLimit,
  HttpStatus,
  requireAppSecret,
  requireMobileUserAgent,
  validateDeviceId,
} from '@/lib/api';
import { HEADER_DEVICE_ID } from '@/config/constants';
import { getUsage } from '@/lib/ai-rate-limit';
import { NextResponse } from 'next/server';

export const GET = async (request: Request): Promise<NextResponse> => {
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

  const usage = await getUsage(deviceIdTrimmed);

  return NextResponse.json(usage);
};
