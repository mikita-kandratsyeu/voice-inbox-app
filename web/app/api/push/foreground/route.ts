import { apiError, HttpStatus, requireAppSecret, validateDeviceId } from '@/lib/api';
import { setAppForeground } from '@/lib/push-tokens';
import { HEADER_DEVICE_ID } from '@/config/constants';
import { NextResponse } from 'next/server';

export const POST = async (request: Request): Promise<NextResponse> => {
  const authError = requireAppSecret(request);

  if (authError) {
    return authError;
  }

  const deviceId = request.headers.get(HEADER_DEVICE_ID);
  const deviceIdError = validateDeviceId(deviceId);

  if (deviceIdError) {
    return apiError(deviceIdError, HttpStatus.BAD_REQUEST);
  }

  await setAppForeground(deviceId!.trim());

  return NextResponse.json({ ok: true });
};
