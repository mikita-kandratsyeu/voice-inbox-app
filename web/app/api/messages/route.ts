import { createMessage } from '@/services/message.service';
import { NextResponse } from 'next/server';

type PostBody = {
  id?: unknown;
  transcript?: unknown;
  model?: unknown;
  systemPrompt?: unknown;
};

function validateString(value: unknown, field: string): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return `${field} is required`;
  }

  return null;
}

export async function POST(request: Request): Promise<NextResponse> {
  const appSecret = request.headers.get('x-app-secret');

  if (appSecret !== process.env.APP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const idError = validateString(body.id, 'id');
  const transcriptError = validateString(body.transcript, 'transcript');
  const modelError = validateString(body.model, 'model');
  const systemPromptError = validateString(body.systemPrompt, 'systemPrompt');

  const firstError = idError ?? transcriptError ?? modelError ?? systemPromptError;

  if (firstError) {
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const result = await createMessage(
    body.id as string,
    body.transcript as string,
    body.model as string,
    body.systemPrompt as string,
  );

  if (!result.created) {
    return NextResponse.json({ error: 'Message with this id already exists' }, { status: 409 });
  }

  const response = NextResponse.json({
    id: body.id,
    status: 'processing',
    ...(result.syncToken && { syncToken: result.syncToken }),
  });

  if (result.syncToken) {
    response.headers.set('x-upstash-sync-token', result.syncToken);
  }

  return response;
}
