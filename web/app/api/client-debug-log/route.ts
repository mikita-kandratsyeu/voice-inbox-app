import { HEADER_DEVICE_ID } from '@/config/constants';
import {
  apiError,
  HttpStatus,
  parseJsonBody,
  requireAppAuth,
  requireMobileUserAgent,
  validateDeviceId,
} from '@/lib/api';
import { NextResponse } from 'next/server';

/** Temporary: mobile forwards [VI-AUDIO-DEBUG] (and similar) for TestFlight investigation. Remove when done. */

type ClientDebugBody = {
  channel?: unknown;
  event?: unknown;
  payload?: unknown;
  clientTs?: unknown;
};

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

  const body = await parseJsonBody<ClientDebugBody>(request);
  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const event = typeof body.event === 'string' ? body.event.trim() : '';
  if (!event || event.length > 512) {
    return apiError('event is required (max 512 chars)', HttpStatus.BAD_REQUEST, {
      pathname: path,
    });
  }

  const channel =
    typeof body.channel === 'string' && body.channel.trim().length > 0
      ? body.channel.trim().slice(0, 64)
      : 'default';

  const clientTs =
    typeof body.clientTs === 'number' && Number.isFinite(body.clientTs) ? body.clientTs : null;

  const payloadStr =
    body.payload === undefined || body.payload === null
      ? ''
      : (() => {
          try {
            return ` ${JSON.stringify(body.payload)}`.slice(0, 16000);
          } catch {
            return ' [payload not serializable]';
          }
        })();

  console.info(
    `[CLIENT-DEBUG] channel=${channel} device=${deviceId!.trim()} clientTs=${clientTs ?? 'n/a'} event=${event}${payloadStr}`,
  );

  return NextResponse.json({ ok: true });
};
