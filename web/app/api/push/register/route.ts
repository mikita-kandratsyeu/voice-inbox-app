import { HEADER_DEVICE_ID } from '@/config/constants';
import {
  apiError,
  checkDeviceRateLimit,
  HttpStatus,
  parseJsonBody,
  requireAppAuth,
  requireMobileUserAgent,
  validateDeviceId,
  validateRequiredStrings,
} from '@/lib/api';
import { sanitizeDeviceModel } from '@/lib/device-model';
import { savePushToken } from '@/lib/push-tokens';
import { NextResponse } from 'next/server';

type RegisterBody = {
  deviceToken?: unknown;
  locale?: unknown;
  platform?: unknown;
  deviceModel?: unknown;
};

const VALID_PLATFORMS = ['ios', 'android'] as const;

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

  const body = await parseJsonBody<RegisterBody>(request);

  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const validationError = validateRequiredStrings([
    { value: body.deviceToken, name: 'deviceToken' },
  ]);
  if (validationError) {
    return apiError(validationError, HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const deviceToken = String(body.deviceToken).trim();

  if (deviceToken.length < 64) {
    return apiError('Invalid deviceToken format', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const locale =
    typeof body.locale === 'string' && /^[a-z]{2}$/.test(body.locale) ? body.locale : null;

  const platform =
    typeof body.platform === 'string' &&
    VALID_PLATFORMS.includes(body.platform as 'ios' | 'android')
      ? (body.platform as 'ios' | 'android')
      : null;

  const hasDeviceModelKey = typeof body === 'object' && body !== null && 'deviceModel' in body;
  const deviceModelUpdate = hasDeviceModelKey
    ? sanitizeDeviceModel(typeof body.deviceModel === 'string' ? body.deviceModel : null)
    : undefined;

  await savePushToken(deviceIdTrimmed, deviceToken, locale, platform, deviceModelUpdate);

  return NextResponse.json({ ok: true });
};
