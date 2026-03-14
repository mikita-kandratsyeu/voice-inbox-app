import { apiError, HttpStatus, parseJsonBody, requireAppSecret, validateDeviceId } from '@/lib/api';
import { sendPushNotification, type PushPayload } from '@/lib/apns';
import { getPushToken } from '@/lib/push-tokens';
import { HEADER_DEVICE_ID } from '@/config/constants';
import { NextResponse } from 'next/server';

type SendPushBody = {
  deviceId?: unknown;
  type?: unknown;
  title?: unknown;
  body?: unknown;
  recordId?: unknown;
};

const VALID_TYPES: PushPayload['type'][] = ['ai_complete', 'policy_update', 'limit_warning'];

export const POST = async (request: Request): Promise<NextResponse> => {
  const authError = requireAppSecret(request);

  if (authError) {
    return authError;
  }

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

  const deviceToken = await getPushToken(deviceId!);
  if (!deviceToken) {
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
  };

  const sent = await sendPushNotification(deviceToken, payload);

  if (!sent) {
    return apiError('Failed to send push notification', HttpStatus.BAD_REQUEST);
  }

  return NextResponse.json({ ok: true });
};
