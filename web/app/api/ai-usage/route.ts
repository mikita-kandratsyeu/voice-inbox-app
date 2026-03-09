import { apiError, HttpStatus, requireAppSecret } from '@/lib/api';
import { HEADER_DEVICE_ID } from '@/config/constants';
import { getUsage } from '@/lib/ai-rate-limit';
import { NextResponse } from 'next/server';

export const GET = async (request: Request): Promise<NextResponse> => {
  const authError = requireAppSecret(request);

  if (authError) return authError;

  const deviceId = request.headers.get(HEADER_DEVICE_ID)?.trim();

  if (!deviceId) {
    return apiError('x-device-id header is required', HttpStatus.BAD_REQUEST);
  }

  const usage = await getUsage(deviceId);

  return NextResponse.json(usage);
};
