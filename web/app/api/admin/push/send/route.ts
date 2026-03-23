import { NextResponse } from 'next/server';

import { writeAdminAudit } from '@/lib/admin-audit';
import { getAdminSession } from '@/lib/admin-session';
import { apiError, HttpStatus, parseJsonBody, validateDeviceId } from '@/lib/api';
import { writeBroadcastHistory } from '@/lib/broadcast-history-log';
import {
  buildPayloadForDevice,
  parseLooseBroadcastBody,
  validateBroadcastMessageLengths,
} from '@/lib/broadcast-push';
import { sendPushNotification, type PushPayload } from '@/lib/push';
import { getPushTokenWithLocale } from '@/lib/push-tokens';

type SendPushBody = {
  deviceId?: unknown;
  type?: unknown;
  title?: unknown;
  body?: unknown;
  message?: unknown;
  i18n?: unknown;
  recordId?: unknown;
};

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

  const broadcastPart = parseLooseBroadcastBody({
    type: body.type,
    title: body.title,
    body: body.body,
    message: body.message,
    i18n: body.i18n,
  });
  const lenErr = validateBroadcastMessageLengths(broadcastPart);
  if (lenErr) {
    return apiError(lenErr, HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const basePayload = buildPayloadForDevice(broadcastPart, data.locale);
  const payload: PushPayload = {
    ...basePayload,
    recordId: typeof body.recordId === 'string' ? body.recordId : undefined,
  };

  const sent = await sendPushNotification(data.token, payload, data.locale);

  if (!sent) {
    await writeBroadcastHistory(admin, {
      kind: 'single_device',
      notifyType: payload.type,
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
    notifyType: payload.type,
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
