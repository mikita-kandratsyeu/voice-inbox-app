import { apiError, HttpStatus } from '@/lib/api';
import { assertMobileAuthenticatedDevice } from '@/lib/mobile-api-guard';
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
  const gate = await assertMobileAuthenticatedDevice(request, PATH);
  if (!gate.ok) {
    return gate.response;
  }

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
  const deviceIdTrimmed = gate.deviceId;

  if (body.deviceId && body.deviceId.trim() && body.deviceId.trim() !== deviceIdTrimmed) {
    return apiError('Forbidden', HttpStatus.FORBIDDEN, {
      pathname: PATH,
      code: ApiErrorCode.ForbiddenDeviceMismatch,
    });
  }

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

  console.log('[Push] send request', { deviceId: deviceIdTrimmed, type: payload.type });
  const sent = await sendPushNotification(data.token, payload, data.locale);

  if (!sent) {
    console.warn('[Push] send: failed', { deviceId: deviceIdTrimmed, type: payload.type });
    return apiError('Failed to send push notification', HttpStatus.BAD_REQUEST, { pathname: PATH });
  }

  console.log('[Push] send: ok', { deviceId: deviceIdTrimmed, type: payload.type });
  return NextResponse.json({ ok: true });
}
