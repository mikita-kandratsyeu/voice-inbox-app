import {
  apiError,
  checkDeviceRateLimit,
  HttpStatus,
  parseJsonBody,
  requireAppAuth,
  requireMobileUserAgent,
  validateAllowedModel,
  validateDeviceId,
  validateRequiredStrings,
} from '@/lib/api';
import {
  buildAiProcessingPrompt,
  sanitizeExistingTaskTextsForPrompt,
  sanitizeTaskExtractionHint,
  type AiProcessingOptions,
} from '@/lib/prompts';
import { HEADER_DEVICE_ID, HEADER_SYNC_TOKEN } from '@/config/constants';
import { setAppForeground } from '@/lib/push-tokens';
import { createMessage } from '@/services/message.service';
import { NextResponse } from 'next/server';

type CreateMessageBody = {
  id?: unknown;
  transcript?: unknown;
  model?: unknown;
  systemPrompt?: unknown;
  options?: AiProcessingOptions;
};

export const POST = async (request: Request): Promise<NextResponse> => {
  const path = new URL(request.url).pathname;
  const authError = await requireAppAuth();
  if (authError) return authError;

  const uaError = await requireMobileUserAgent();
  if (uaError) return uaError;

  const deviceId = request.headers.get(HEADER_DEVICE_ID);
  const deviceIdError = validateDeviceId(deviceId);
  if (deviceIdError) {
    return apiError(deviceIdError, HttpStatus.BAD_REQUEST, { pathname: path });
  }
  const deviceIdTrimmed = deviceId!.trim();

  const rateLimitError = await checkDeviceRateLimit(deviceIdTrimmed);
  if (rateLimitError) return rateLimitError;

  const body = await parseJsonBody<CreateMessageBody>(request);

  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const validationError = validateRequiredStrings([
    { value: body.id, name: 'id' },
    { value: body.transcript, name: 'transcript' },
    { value: body.model, name: 'model' },
  ]);
  if (validationError) {
    return apiError(validationError, HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const {
    id,
    transcript,
    model,
    systemPrompt,
    options: rawOptions,
  } = body as {
    id: string;
    transcript: string;
    model: string;
    systemPrompt?: string;
    options?: AiProcessingOptions & { existingTaskTexts?: unknown; taskExtractionHint?: unknown };
  };

  const modelError = validateAllowedModel(model);
  if (modelError) {
    return apiError(modelError, HttpStatus.BAD_REQUEST, { pathname: path });
  }

  let options: AiProcessingOptions | undefined;
  if (rawOptions && typeof rawOptions === 'object') {
    const { existingTaskTexts: rawExisting, taskExtractionHint: rawHint, ...rest } = rawOptions;
    const existing = sanitizeExistingTaskTextsForPrompt(rawExisting);
    const hint = sanitizeTaskExtractionHint(rawHint);
    options = {
      ...rest,
      ...(existing ? { existingTaskTexts: existing } : {}),
      ...(hint ? { taskExtractionHint: hint } : {}),
    };
  }

  const resolvedSystemPrompt =
    options != null ? buildAiProcessingPrompt(options) : (systemPrompt ?? '');

  if (!resolvedSystemPrompt.trim()) {
    return apiError('systemPrompt or options is required', HttpStatus.BAD_REQUEST, {
      pathname: path,
    });
  }

  await setAppForeground(deviceIdTrimmed);

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
    return apiError('Message with this id already exists', HttpStatus.CONFLICT, { pathname: path });
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
