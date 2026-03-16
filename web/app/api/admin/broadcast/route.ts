import { NextResponse } from 'next/server';

import { apiError, HttpStatus, parseJsonBody } from '@/lib/api';
import { runBroadcast, type BroadcastInput } from '@/lib/broadcast-push';

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

export async function POST(request: Request): Promise<NextResponse> {
  const body = await parseJsonBody<BroadcastBody>(request);
  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST);
  }

  try {
    const result = await runBroadcast(toBroadcastInput(body));
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Broadcast failed';
    return apiError(msg, HttpStatus.BAD_REQUEST);
  }
}
