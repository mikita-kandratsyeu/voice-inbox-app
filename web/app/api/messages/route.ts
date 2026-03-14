import {
  apiError,
  HttpStatus,
  parseJsonBody,
  requireAppSecret,
  validateDeviceId,
  validateRequiredStrings,
} from '@/lib/api';
import { buildAiProcessingPrompt } from '@/lib/prompts';
import { HEADER_DEVICE_ID, HEADER_SYNC_TOKEN } from '@/config/constants';
import { createMessage } from '@/services/message.service';
import { NextResponse } from 'next/server';

type AiProcessingOptions = {
  summaryStyle?: 'brief' | 'standard' | 'detailed';
  taskStrictness?: 'strict' | 'balanced' | 'soft';
  outputLanguage?: 'same' | 'ru' | 'en';
};

type CreateMessageBody = {
  id?: unknown;
  transcript?: unknown;
  model?: unknown;
  systemPrompt?: unknown;
  options?: AiProcessingOptions;
};

export const POST = async (request: Request): Promise<NextResponse> => {
  const authError = requireAppSecret(request);

  if (authError) {
    return authError;
  }

  const deviceId = request.headers.get(HEADER_DEVICE_ID);
  const deviceIdError = validateDeviceId(deviceId);

  if (deviceIdError) {
    return apiError(deviceIdError, HttpStatus.BAD_REQUEST);
  }
  const deviceIdTrimmed = deviceId!.trim();

  const body = await parseJsonBody<CreateMessageBody>(request);

  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST);
  }

  const validationError = validateRequiredStrings([
    { value: body.id, name: 'id' },
    { value: body.transcript, name: 'transcript' },
    { value: body.model, name: 'model' },
  ]);
  if (validationError) {
    return apiError(validationError, HttpStatus.BAD_REQUEST);
  }

  const { id, transcript, model, systemPrompt, options } = body as {
    id: string;
    transcript: string;
    model: string;
    systemPrompt?: string;
    options?: AiProcessingOptions;
  };

  const resolvedSystemPrompt =
    options != null ? buildAiProcessingPrompt(options) : (systemPrompt ?? '');

  if (!resolvedSystemPrompt.trim()) {
    return apiError('systemPrompt or options is required', HttpStatus.BAD_REQUEST);
  }

  const result = await createMessage(id, transcript, model, resolvedSystemPrompt, deviceIdTrimmed);

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
