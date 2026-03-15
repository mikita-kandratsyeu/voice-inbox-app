import {
  apiError,
  HttpStatus,
  parseJsonBody,
  requireAppSecret,
  validateDeviceId,
  validateRequiredStrings,
} from '@/lib/api';
import { savePushToken } from '@/lib/push-tokens';
import { HEADER_DEVICE_ID } from '@/config/constants';
import { NextResponse } from 'next/server';

type RegisterBody = {
  deviceToken?: unknown;
  locale?: unknown;
  platform?: unknown;
};

const VALID_PLATFORMS = ['ios', 'android'] as const;

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
  const deviceIdTrimmed = deviceId!.trim();

  const body = await parseJsonBody<RegisterBody>(request);

  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST);
  }

  const validationError = validateRequiredStrings([
    { value: body.deviceToken, name: 'deviceToken' },
  ]);
  if (validationError) {
    return apiError(validationError, HttpStatus.BAD_REQUEST);
  }

  const deviceToken = String(body.deviceToken).trim();

  if (deviceToken.length < 64) {
    return apiError('Invalid deviceToken format', HttpStatus.BAD_REQUEST);
  }

  const locale =
    typeof body.locale === 'string' && /^[a-z]{2}$/.test(body.locale) ? body.locale : null;

  const platform =
    typeof body.platform === 'string' &&
    VALID_PLATFORMS.includes(body.platform as 'ios' | 'android')
      ? (body.platform as 'ios' | 'android')
      : null;

  await savePushToken(deviceIdTrimmed, deviceToken, locale, platform);

  return NextResponse.json({ ok: true });
};
