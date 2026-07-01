import { NextResponse } from 'next/server';

import { handleAiWorkerPost } from '@/lib/ai-worker-http';

export const runtime = 'nodejs';

export const maxDuration = 300;

export const POST = async (request: Request): Promise<NextResponse> => {
  const result = await handleAiWorkerPost(request);
  return NextResponse.json(result.body, { status: result.status });
};
