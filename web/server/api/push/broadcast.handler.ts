import { apiError, HttpStatus, parseJsonBody } from '@/lib/api';
import { assertMobileAuthenticatedDevice } from '@/lib/mobile-api-guard';
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
  const gate = await assertMobileAuthenticatedDevice(request, PATH);
  if (!gate.ok) {
    return gate.response;
  }

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
