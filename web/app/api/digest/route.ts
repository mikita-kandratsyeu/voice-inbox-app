import { NextResponse } from 'next/server';

import { ApiErrorCode } from '@/lib/api-error-codes';
import {
  apiError,
  HttpStatus,
  parseJsonBody,
  parseAllowedAiModel,
  validateRequiredStrings,
  weeklyAiLimitExceededResponse,
} from '@/lib/api';
import { assertMobileAiRouteContext } from '@/lib/mobile-ai-route';
import { checkAndIncrement, decrement } from '@/lib/ai-rate-limit';
import { resolveAutoAiModel, type AiModelMode } from '@/lib/ai-model-router';
import { setAppForeground } from '@/lib/push-tokens';
import { processDigest } from '@/services/ai.service';

export const maxDuration = 120;

type DigestRequestBody = {
  payload?: unknown;
  model?: unknown;
  modelMode?: unknown;
};

export const POST = async (request: Request): Promise<NextResponse> => {
  const guard = await assertMobileAiRouteContext(request);
  if (!guard.ok) {
    return guard.response;
  }
  const { deviceId: deviceIdTrimmed, pathname, request: req } = guard.ctx;

  const body = await parseJsonBody<DigestRequestBody>(req);
  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.InvalidJson,
    });
  }

  const validationError = validateRequiredStrings([
    { value: body.payload, name: 'payload' },
    { value: body.model, name: 'model' },
  ]);
  if (validationError) {
    return apiError(validationError, HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.ValidationError,
    });
  }

  const payload = String(body.payload);
  if (payload.length > 30_000) {
    return apiError('payload is too large', HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.PayloadTooLarge,
    });
  }

  const modelMode: AiModelMode = body.modelMode === 'auto' ? 'auto' : 'manual';
  const requestedModel = String(body.model);
  let resolvedModel =
    modelMode === 'auto'
      ? resolveAutoAiModel({ taskType: 'summary_tasks', routingChars: payload.length })
      : requestedModel;

  const modelParsed = parseAllowedAiModel(resolvedModel);
  if (!modelParsed.ok) {
    return apiError(modelParsed.error, HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.InvalidModel,
    });
  }
  resolvedModel = modelParsed.model;

  const limitResult = await checkAndIncrement(deviceIdTrimmed);
  if (!limitResult.allowed) {
    return weeklyAiLimitExceededResponse(limitResult.usage);
  }

  await setAppForeground(deviceIdTrimmed);

  try {
    const result = await processDigest(payload, resolvedModel, req.headers.get('user-agent'));
    return NextResponse.json({ ...result, model: resolvedModel });
  } catch (err) {
    await decrement(deviceIdTrimmed);
    return apiError(err instanceof Error ? err.message : 'Digest generation failed', 503, {
      pathname,
      code: ApiErrorCode.ServiceUnavailable,
    });
  }
};
