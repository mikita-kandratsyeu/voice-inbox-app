import { apiError, HttpStatus, parseJsonBody, requireAppSecret } from '@/lib/api';
import { runBroadcast } from '@/lib/broadcast-push';
import { NextResponse } from 'next/server';

type BroadcastBody = {
  type?: unknown;
  title?: unknown;
  body?: unknown;
  message?: unknown;
};

export const POST = async (request: Request): Promise<NextResponse> => {
  const authError = requireAppSecret(request);

  if (authError) {
    return authError;
  }

  const body = await parseJsonBody<BroadcastBody>(request);

  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST);
  }

  const result = await runBroadcast(body);
  console.log('[Push] broadcast done', result);
  return NextResponse.json(result);
};
