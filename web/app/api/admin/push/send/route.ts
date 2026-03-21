import { NextResponse } from 'next/server';

import { writeAdminAudit } from '@/lib/admin-audit';
import { getAdminSession } from '@/lib/admin-session';
import { apiError, HttpStatus, parseJsonBody, validateDeviceId } from '@/lib/api';
import { writeBroadcastHistory } from '@/lib/broadcast-history-log';
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

const MAX_MESSAGE_CHARS = 3500;

export async function POST(request: Request): Promise<NextResponse> {
  const path = new URL(request.url).pathname;
  const admin = await getAdminSession();
  if (!admin) {
    return apiError('Unauthorized', HttpStatus.UNAUTHORIZED, { pathname: path });
  }

  const body = await parseJsonBody<SendPushBody>(request);

  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : null;
  const deviceIdError = validateDeviceId(deviceId);

  if (deviceIdError) {
    return apiError(deviceIdError, HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const data = await getPushTokenWithLocale(deviceId!);
  if (!data) {
    return apiError('Device not registered for push notifications', HttpStatus.NOT_FOUND, {
      pathname: path,
    });
  }

  const type =
    typeof body.type === 'string' && VALID_TYPES.includes(body.type as PushPayload['type'])
      ? (body.type as PushPayload['type'])
      : 'policy_update';

  const rawMessage = typeof body.message === 'string' ? body.message : undefined;
  if (rawMessage !== undefined && rawMessage.length > MAX_MESSAGE_CHARS) {
    return apiError(
      `message is too long (max ${MAX_MESSAGE_CHARS} characters)`,
      HttpStatus.BAD_REQUEST,
      {
        pathname: path,
      },
    );
  }

  const payload: PushPayload = {
    type,
    title: typeof body.title === 'string' ? body.title : undefined,
    body: typeof body.body === 'string' ? body.body : undefined,
    message: rawMessage,
    recordId: typeof body.recordId === 'string' ? body.recordId : undefined,
  };

  const sent = await sendPushNotification(data.token, payload, data.locale);

  if (!sent) {
    await writeBroadcastHistory(admin, {
      kind: 'single_device',
      notifyType: type,
      title: payload.title,
      body: payload.body,
      message: payload.message,
      sent: 0,
      failed: 1,
      total: 1,
      errorSample: 'sendPushNotification returned false',
      deviceId: deviceId!,
    });
    await writeAdminAudit(admin, 'push.single', { deviceId: deviceId!, ok: false });
    return apiError('Failed to send push notification', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  await writeBroadcastHistory(admin, {
    kind: 'single_device',
    notifyType: type,
    title: payload.title,
    body: payload.body,
    message: payload.message,
    sent: 1,
    failed: 0,
    total: 1,
    deviceId: deviceId!,
  });
  await writeAdminAudit(admin, 'push.single', { deviceId: deviceId!, ok: true });

  return NextResponse.json({ ok: true });
}
