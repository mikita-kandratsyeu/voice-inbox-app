import {
  apiError,
  checkDeviceRateLimit,
  HttpStatus,
  parseJsonBody,
  requireAppSecret,
  requireMobileUserAgent,
  validateDeviceId,
} from '@/lib/api';
import { sendPushNotification, type PushPayload } from '@/lib/push';
import { getPushTokenWithLocale } from '@/lib/push-tokens';
import { HEADER_DEVICE_ID } from '@/config/constants';
import { NextResponse } from 'next/server';

type SendPushBody = {
  deviceId?: unknown;
  type?: unknown;
  title?: unknown;
  body?: unknown;
  recordId?: unknown;
  message?: unknown;
};

const VALID_TYPES: PushPayload['type'][] = [
  'ai_complete',
  'policy_update',
  'limit_warning',
  'limit_exceeded',
];

export const POST = async (request: Request): Promise<NextResponse> => {
  const authError = requireAppSecret(request);
  if (authError) return authError;

  const uaError = requireMobileUserAgent(request);
  if (uaError) return uaError;

  const body = await parseJsonBody<SendPushBody>(request);
  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST);
  }

  const deviceId =
    typeof body.deviceId === 'string'
      ? body.deviceId.trim()
      : request.headers.get(HEADER_DEVICE_ID)?.trim();
  const deviceIdError = validateDeviceId(deviceId);
  if (deviceIdError) {
    return apiError(deviceIdError, HttpStatus.BAD_REQUEST);
  }
  const deviceIdTrimmed = deviceId!;

  const rateLimitError = await checkDeviceRateLimit(deviceIdTrimmed);
  if (rateLimitError) return rateLimitError;

  const data = await getPushTokenWithLocale(deviceIdTrimmed);
  if (!data) {
    console.warn('[Push] send: no token for deviceId', deviceIdTrimmed);
    return apiError('Device not registered for push notifications', HttpStatus.NOT_FOUND);
  }

  const type =
    typeof body.type === 'string' && VALID_TYPES.includes(body.type as PushPayload['type'])
      ? (body.type as PushPayload['type'])
      : 'ai_complete';

  const payload: PushPayload = {
    type,
    title: typeof body.title === 'string' ? body.title : undefined,
    body: typeof body.body === 'string' ? body.body : undefined,
    recordId: typeof body.recordId === 'string' ? body.recordId : undefined,
    message: typeof body.message === 'string' ? body.message : undefined,
  };

  console.log('[Push] send request', { deviceId, type: payload.type });
  const sent = await sendPushNotification(data.token, payload, data.locale);

  if (!sent) {
    console.warn('[Push] send: failed', { deviceId, type: payload.type });
    return apiError('Failed to send push notification', HttpStatus.BAD_REQUEST);
  }

  console.log('[Push] send: ok', { deviceId, type: payload.type });
  return NextResponse.json({ ok: true });
};
