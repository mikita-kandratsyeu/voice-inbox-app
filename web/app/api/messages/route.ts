import {
  apiError,
  HttpStatus,
  parseJsonBody,
  requireAppSecret,
  validateRequiredStrings,
} from '@/lib/api';
import { HEADER_DEVICE_ID, HEADER_SYNC_TOKEN } from '@/config/constants';
import { createMessage } from '@/services/message.service';
import { NextResponse } from 'next/server';

type CreateMessageBody = {
  id?: unknown;
  transcript?: unknown;
  model?: unknown;
  systemPrompt?: unknown;
};

export const POST = async (request: Request): Promise<NextResponse> => {
  const authError = requireAppSecret(request);

  if (authError) {
    return authError;
  }

  const deviceId = request.headers.get(HEADER_DEVICE_ID)?.trim();
  if (!deviceId) {
    return apiError('x-device-id header is required', HttpStatus.BAD_REQUEST);
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

  const result = await createMessage(id, transcript, model, systemPrompt, deviceId);

  if (!result.created && 'limitExceeded' in result && result.limitExceeded) {
    return NextResponse.json(
      {
        error: 'Weekly AI limit reached',
        usage: result.usage,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(
            Math.ceil((new Date(result.usage.resetAt).getTime() - Date.now()) / 1000),
          ),
        },
      },
    );
  }

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
};
