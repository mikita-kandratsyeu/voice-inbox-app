import { HEADER_DEVICE_ID } from '@/config/constants';
import {
  apiError,
  checkDeviceRateLimit,
  HttpStatus,
  requireAppAuth,
  requireMobileUserAgent,
  validateDeviceId,
} from '@/lib/api';
import { ApiErrorCode } from '@/lib/api-error-codes';
import { sendPushNotification, type PushPayload } from '@/lib/push';
import { getPushTokenWithLocale } from '@/lib/push-tokens';
import { pushSendBodySchema } from '@/server/api/schemas/push.schema';
import { zodValidationErrorResponse } from '@/server/api/schemas/zod-api-error';
import { NextResponse } from 'next/server';

const PATH = '/api/push/send';

const VALID_TYPES: PushPayload['type'][] = [
  'ai_complete',
  'policy_update',
  'limit_warning',
  'limit_exceeded',
];

export async function postPushSend(request: Request): Promise<NextResponse> {
  const authError = await requireAppAuth();
  if (authError) return authError;

  const uaError = await requireMobileUserAgent();
  if (uaError) return uaError;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST, {
      pathname: PATH,
      code: ApiErrorCode.InvalidJson,
    });
  }

  const parsed = pushSendBodySchema.safeParse(raw);
  if (!parsed.success) {
    return zodValidationErrorResponse(PATH, parsed.error);
  }

  const body = parsed.data;

  const deviceId =
    body.deviceId && body.deviceId.length > 0
      ? body.deviceId
      : request.headers.get(HEADER_DEVICE_ID)?.trim();
  const deviceIdError = validateDeviceId(deviceId);
  if (deviceIdError) {
    return apiError(deviceIdError, HttpStatus.BAD_REQUEST, { pathname: PATH });
  }
  const deviceIdTrimmed = deviceId!;

  const rateLimitError = await checkDeviceRateLimit(deviceIdTrimmed);
  if (rateLimitError) return rateLimitError;

  const data = await getPushTokenWithLocale(deviceIdTrimmed);
  if (!data) {
    console.warn('[Push] send: no token for deviceId', deviceIdTrimmed);
    return apiError('Device not registered for push notifications', HttpStatus.NOT_FOUND, {
      pathname: PATH,
    });
  }

  const type = body.type && VALID_TYPES.includes(body.type) ? body.type : 'ai_complete';

  const payload: PushPayload = {
    type,
    title: body.title,
    body: body.body,
    recordId: body.recordId,
    message: body.message,
  };

  console.log('[Push] send request', { deviceId, type: payload.type });
  const sent = await sendPushNotification(data.token, payload, data.locale);

  if (!sent) {
    console.warn('[Push] send: failed', { deviceId, type: payload.type });
    return apiError('Failed to send push notification', HttpStatus.BAD_REQUEST, { pathname: PATH });
  }

  console.log('[Push] send: ok', { deviceId, type: payload.type });
  return NextResponse.json({ ok: true });
}
