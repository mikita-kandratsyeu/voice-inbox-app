import {
  apiError,
  HttpStatus,
  parseJsonBody,
  requireAppSecret,
  validateRequiredStrings,
} from '@/lib/api';
import { createMessage } from '@/services/message.service';
import { NextResponse } from 'next/server';

type CreateMessageBody = {
  id?: unknown;
  transcript?: unknown;
  model?: unknown;
  systemPrompt?: unknown;
};

const HEADER_SYNC_TOKEN = 'x-upstash-sync-token';

export async function POST(request: Request): Promise<NextResponse> {
  const authError = requireAppSecret(request);

  if (authError) {
    return authError;
  }

  const body = await parseJsonBody<CreateMessageBody>(request);
  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST);
  }

  const validationError = validateRequiredStrings([
    { value: body.id, name: 'id' },
    { value: body.transcript, name: 'transcript' },
    { value: body.model, name: 'model' },
    { value: body.systemPrompt, name: 'systemPrompt' },
  ]);
  if (validationError) {
    return apiError(validationError, HttpStatus.BAD_REQUEST);
  }

  const { id, transcript, model, systemPrompt } = body as {
    id: string;
    transcript: string;
    model: string;
    systemPrompt: string;
  };

  const result = await createMessage(id, transcript, model, systemPrompt);

  if (!result.created) {
    return apiError('Message with this id already exists', HttpStatus.CONFLICT);
  }

  const response = NextResponse.json({
    id,
    status: 'processing',
    ...(result.syncToken && { syncToken: result.syncToken }),
  });

  if (result.syncToken) {
    response.headers.set(HEADER_SYNC_TOKEN, result.syncToken);
  }

  return response;
}
