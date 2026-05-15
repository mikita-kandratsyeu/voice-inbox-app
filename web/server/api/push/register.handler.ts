import { apiError, assertMobileAuthenticatedDevice, HttpStatus } from '@/lib/api';
import { ApiErrorCode } from '@/lib/api-error-codes';
import { sanitizeDeviceModel } from '@/lib/device-model';
import {
  sanitizeAppVersion,
  sanitizeBuildNumber,
  sanitizeOsVersion,
} from '@/lib/push-token-fields';
import { savePushToken, type PushTokenMetadataPatch } from '@/lib/push-tokens';
import { pushRegisterBodySchema } from '@/server/api/schemas/push.schema';
import { zodValidationErrorResponse } from '@/server/api/schemas/zod-api-error';
import { NextResponse } from 'next/server';

const PATH = '/api/push/register';

export async function postPushRegister(request: Request): Promise<NextResponse> {
  const gate = await assertMobileAuthenticatedDevice(request, PATH);
  if (!gate.ok) {
    return gate.response;
  }
  const { deviceId: deviceIdTrimmed } = gate;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST, {
      pathname: PATH,
      code: ApiErrorCode.InvalidJson,
    });
  }

  const parsed = pushRegisterBodySchema.safeParse(raw);
  if (!parsed.success) {
    return zodValidationErrorResponse(PATH, parsed.error);
  }

  const body = parsed.data;
  const deviceToken = body.deviceToken;

  const metaPatch: PushTokenMetadataPatch = {};
  if ('deviceModel' in body) {
    metaPatch.deviceModel = sanitizeDeviceModel(
      typeof body.deviceModel === 'string' ? body.deviceModel : null,
    );
  }
  if ('appVersion' in body) {
    metaPatch.appVersion = sanitizeAppVersion(body.appVersion);
  }
  if ('buildNumber' in body) {
    metaPatch.buildNumber = sanitizeBuildNumber(body.buildNumber);
  }
  if ('osVersion' in body) {
    metaPatch.osVersion = sanitizeOsVersion(body.osVersion);
  }

  await savePushToken(
    deviceIdTrimmed,
    deviceToken,
    body.locale ?? null,
    body.platform ?? null,
    Object.keys(metaPatch).length > 0 ? metaPatch : undefined,
  );

  return NextResponse.json({ ok: true });
}
