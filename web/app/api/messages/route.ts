import { ApiErrorCode } from '@/lib/api-error-codes';
import {
  apiError,
  HttpStatus,
  parseJsonBody,
  validateAllowedModel,
  validateRequiredStrings,
  weeklyAiLimitExceededResponse,
} from '@/lib/api';
import { assertMobileAiRouteContext } from '@/lib/mobile-ai-route';
import {
  buildAiProcessingPrompt,
  sanitizeExistingTaskTextsForPrompt,
  sanitizeTaskExtractionHint,
  type AiProcessingOptions,
} from '@/lib/prompts';
import { HEADER_SYNC_TOKEN } from '@/config/constants';
import {
  estimateSummaryTasksRoutingChars,
  resolveAutoAiModel,
  type AiModelMode,
} from '@/lib/ai-model-router';
import { setAppForeground } from '@/lib/push-tokens';
import { clampMessageTtlSeconds } from '@/lib/message-kv-ttl';
import { createMessage } from '@/services/message.service';
import { NextResponse } from 'next/server';

type CreateMessageBody = {
  id?: unknown;
  transcript?: unknown;
  model?: unknown;
  modelMode?: unknown;
  routingContext?: unknown;
  systemPrompt?: unknown;
  options?: AiProcessingOptions;
  messageTtlSeconds?: unknown;
};

export const POST = async (request: Request): Promise<NextResponse> => {
  const guard = await assertMobileAiRouteContext(request);
  if (!guard.ok) {
    return guard.response;
  }
  const { deviceId: deviceIdTrimmed, pathname, request: req } = guard.ctx;

  const body = await parseJsonBody<CreateMessageBody>(req);

  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.InvalidJson,
    });
  }

  const validationError = validateRequiredStrings([
    { value: body.id, name: 'id' },
    { value: body.transcript, name: 'transcript' },
    { value: body.model, name: 'model' },
  ]);
  if (validationError) {
    return apiError(validationError, HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.ValidationError,
    });
  }

  const {
    id,
    transcript,
    model,
    modelMode: rawModelMode,
    routingContext: rawRoutingContext,
    systemPrompt,
    options: rawOptions,
    messageTtlSeconds: rawMessageTtl,
  } = body as {
    id: string;
    transcript: string;
    model: string;
    modelMode?: AiModelMode;
    routingContext?: { taskType?: unknown; transcriptChars?: unknown };
    systemPrompt?: string;
    options?: AiProcessingOptions & { existingTaskTexts?: unknown; taskExtractionHint?: unknown };
    messageTtlSeconds?: unknown;
  };

  const messageTtlSeconds = clampMessageTtlSeconds(rawMessageTtl);

  let options: AiProcessingOptions | undefined;
  if (rawOptions && typeof rawOptions === 'object') {
    const {
      existingTaskTexts: rawExisting,
      taskExtractionHint: rawHint,
      processingPreset: rawProcessingPreset,
      ...rest
    } = rawOptions;
    const existing = sanitizeExistingTaskTextsForPrompt(rawExisting);
    const hint = sanitizeTaskExtractionHint(rawHint);
    const processingPreset = rawProcessingPreset === 'meeting' ? 'meeting' : undefined;
    options = {
      ...rest,
      ...(processingPreset ? { processingPreset } : {}),
      ...(existing ? { existingTaskTexts: existing } : {}),
      ...(hint ? { taskExtractionHint: hint } : {}),
    };
  }

  const modelMode: AiModelMode = rawModelMode === 'auto' ? 'auto' : 'manual';
  const routingTaskType = rawRoutingContext?.taskType === 'ask' ? 'ask' : 'summary_tasks';
  const routingChars =
    routingTaskType === 'ask'
      ? transcript.length
      : estimateSummaryTasksRoutingChars(transcript, options);
  const resolvedModel =
    modelMode === 'auto'
      ? resolveAutoAiModel({
          taskType: routingTaskType,
          routingChars,
          ...(routingTaskType === 'ask' ? { askRoutingBasis: 'transcript_only' as const } : {}),
        })
      : model;

  const modelError = validateAllowedModel(resolvedModel);
  if (modelError) {
    return apiError(modelError, HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.InvalidModel,
    });
  }

  const resolvedSystemPrompt =
    options != null ? buildAiProcessingPrompt(options) : (systemPrompt ?? '');

  if (!resolvedSystemPrompt.trim()) {
    return apiError('systemPrompt or options is required', HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.MissingSystemPrompt,
    });
  }

  await setAppForeground(deviceIdTrimmed);

  const result = await createMessage(
    id,
    transcript,
    resolvedModel,
    resolvedSystemPrompt,
    deviceIdTrimmed,
    req.headers.get('user-agent'),
    messageTtlSeconds,
  );

  if (!result.created && 'limitExceeded' in result && result.limitExceeded) {
    return weeklyAiLimitExceededResponse(result.usage);
  }

  if (!result.created) {
    return apiError('Message with this id already exists', HttpStatus.CONFLICT, {
      pathname,
      code: ApiErrorCode.DuplicateId,
    });
  }

  const response = NextResponse.json({
    id,
    status: 'processing',
    model: resolvedModel,
    ...(result.syncToken && { syncToken: result.syncToken }),
  });

  if (result.syncToken) {
    response.headers.set(HEADER_SYNC_TOKEN, result.syncToken);
  }

  return response;
};
