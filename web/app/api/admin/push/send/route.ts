import { NextResponse } from 'next/server';

import { apiError, HttpStatus, parseJsonBody, validateDeviceId } from '@/lib/api';
import { sendPushNotification, type PushPayload } from '@/lib/push';
import { getPushTokenWithLocale } from '@/lib/push-tokens';

type SendPushBody = {
  deviceId?: unknown;
  type?: unknown;
  title?: unknown;
  body?: unknown;
  message?: unknown;
  recordId?: unknown;
};

const VALID_TYPES: PushPayload['type'][] = [
  'ai_complete',
  'policy_update',
  'limit_warning',
  'limit_exceeded',
];

export async function POST(request: Request): Promise<NextResponse> {
  const body = await parseJsonBody<SendPushBody>(request);

  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST);
  }

  const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : null;
  const deviceIdError = validateDeviceId(deviceId);

  if (deviceIdError) {
    return apiError(deviceIdError, HttpStatus.BAD_REQUEST);
  }

  const data = await getPushTokenWithLocale(deviceId!);
  if (!data) {
    return apiError('Device not registered for push notifications', HttpStatus.NOT_FOUND);
  }

  const type =
    typeof body.type === 'string' && VALID_TYPES.includes(body.type as PushPayload['type'])
      ? (body.type as PushPayload['type'])
      : 'policy_update';

  const payload: PushPayload = {
    type,
    title: typeof body.title === 'string' ? body.title : undefined,
    body: typeof body.body === 'string' ? body.body : undefined,
    message: typeof body.message === 'string' ? body.message : undefined,
    recordId: typeof body.recordId === 'string' ? body.recordId : undefined,
  };

  const sent = await sendPushNotification(data.token, payload, data.locale);

  if (!sent) {
    return apiError('Failed to send push notification', HttpStatus.BAD_REQUEST);
  }

  return NextResponse.json({ ok: true });
}
