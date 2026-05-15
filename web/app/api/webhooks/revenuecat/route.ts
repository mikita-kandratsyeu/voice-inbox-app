import { ApiErrorCode } from '@/lib/api-error-codes';
import { apiError, HttpStatus } from '@/lib/api';
import {
  applyRevenueCatWebhookPayload,
  verifyRevenueCatWebhookAuthorization,
} from '@/lib/revenuecat-webhook';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const PATH = '/api/webhooks/revenuecat';

export const POST = async (request: Request): Promise<NextResponse> => {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return apiError('webhook_not_configured', HttpStatus.SERVICE_UNAVAILABLE, {
      pathname: PATH,
      code: ApiErrorCode.WebhookNotConfigured,
    });
  }

  const auth = request.headers.get('authorization');
  if (!verifyRevenueCatWebhookAuthorization(auth, secret)) {
    return apiError('unauthorized', HttpStatus.UNAUTHORIZED, {
      pathname: PATH,
      code: ApiErrorCode.Unauthorized,
    });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiError('invalid_json', HttpStatus.BAD_REQUEST, {
      pathname: PATH,
      code: ApiErrorCode.InvalidJson,
    });
  }

  try {
    await applyRevenueCatWebhookPayload(payload);
  } catch (e) {
    console.error('[webhooks/revenuecat]', e);
    return apiError('server_error', 500, {
      pathname: PATH,
      code: ApiErrorCode.WebhookServerError,
    });
  }

  return NextResponse.json({ ok: true });
};
