import {
  apiError,
  HttpStatus,
  parseJsonBody,
  requireAppAuth,
  requireMobileUserAgent,
} from '@/lib/api';
import { runBroadcast, type BroadcastInput } from '@/lib/broadcast-push';
import { NextResponse } from 'next/server';

type BroadcastBody = {
  type?: unknown;
  title?: unknown;
  body?: unknown;
  message?: unknown;
};

function toBroadcastInput(body: BroadcastBody): BroadcastInput {
  return {
    type: typeof body.type === 'string' ? body.type : undefined,
    title: typeof body.title === 'string' ? body.title : undefined,
    body: typeof body.body === 'string' ? body.body : undefined,
    message: typeof body.message === 'string' ? body.message : undefined,
  };
}

export const POST = async (request: Request): Promise<NextResponse> => {
  const path = new URL(request.url).pathname;
  const authError = await requireAppAuth();
  if (authError) return authError;

  const uaError = await requireMobileUserAgent();
  if (uaError) return uaError;

  const body = await parseJsonBody<BroadcastBody>(request);

  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const result = await runBroadcast(toBroadcastInput(body));
  console.log('[Push] broadcast done', result);
  return NextResponse.json(result);
};
