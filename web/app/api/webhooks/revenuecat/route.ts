import {
  applyRevenueCatWebhookPayload,
  verifyRevenueCatWebhookAuthorization,
} from '@/lib/revenuecat-webhook';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export const POST = async (request: Request): Promise<NextResponse> => {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: 'webhook_not_configured' }, { status: 503 });
  }

  const auth = request.headers.get('authorization');
  if (!verifyRevenueCatWebhookAuthorization(auth, secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    await applyRevenueCatWebhookPayload(payload);
  } catch (e) {
    console.error('[webhooks/revenuecat]', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
};
