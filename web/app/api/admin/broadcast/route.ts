import { NextResponse } from 'next/server';

import { apiError, HttpStatus, parseJsonBody } from '@/lib/api';
import { runBroadcast } from '@/lib/broadcast-push';

type BroadcastBody = {
  type?: unknown;
  title?: unknown;
  body?: unknown;
  message?: unknown;
};

export async function POST(request: Request): Promise<NextResponse> {
  const body = await parseJsonBody<BroadcastBody>(request);
  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST);
  }

  try {
    const result = await runBroadcast(body);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Broadcast failed';
    return apiError(msg, HttpStatus.BAD_REQUEST);
  }
}
