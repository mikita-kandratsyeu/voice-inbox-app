import {
  apiError,
  HttpStatus,
  parseJsonBody,
  requireAppAuth,
  requireMobileUserAgent,
} from '@/lib/api';
import {
  parseLooseBroadcastBody,
  runBroadcast,
  validateBroadcastMessageLengths,
} from '@/lib/broadcast-push';
import { NextResponse } from 'next/server';

type BroadcastBody = {
  type?: unknown;
  title?: unknown;
  body?: unknown;
  message?: unknown;
  i18n?: unknown;
};

const PATH = '/api/push/broadcast';

export async function postPushBroadcast(request: Request): Promise<NextResponse> {
  const authError = await requireAppAuth();
  if (authError) return authError;

  const uaError = await requireMobileUserAgent();
  if (uaError) return uaError;

  const body = await parseJsonBody<BroadcastBody>(request);

  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST, { pathname: PATH });
  }

  const input = parseLooseBroadcastBody(body);
  const lenErr = validateBroadcastMessageLengths(input);
  if (lenErr) {
    return apiError(lenErr, HttpStatus.BAD_REQUEST, { pathname: PATH });
  }

  const result = await runBroadcast(input);
  console.log('[Push] broadcast done', result);
  return NextResponse.json(result);
}
