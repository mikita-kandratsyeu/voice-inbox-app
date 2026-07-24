import { NextResponse } from 'next/server';

import { ApiErrorCode } from '@/lib/api-error-codes';
import {
  apiError,
  HttpStatus,
  parseJsonBody,
  parseAllowedAiModelForDevice,
  validateRequiredStrings,
  weeklyAiLimitExceededResponse,
} from '@/lib/api';
import { assertMobileAiRouteContext } from '@/lib/mobile-ai-route';
import { logAiRequest } from '@/lib/ai-operation';
import { checkAndIncrement, decrement } from '@/lib/ai-rate-limit';
import {
  aiModelClientResponseFields,
  aiModelLedgerMetadata,
  aiModelResponseFields,
} from '@/lib/ai-model-display';
import { updateAiUsageLedgerMetadata } from '@/lib/ai-usage-ledger';
import { resolveAutoAiModel, type AiModelMode } from '@/lib/ai-model-router';
import { setAppForeground } from '@/lib/push-tokens';
import { processDigest } from '@/services/ai.service';

export const runtime = 'nodejs';

export const maxDuration = 300;

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
  const { deviceId: deviceIdTrimmed, pathname, request: req, aiOperation } = guard.ctx;

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

  const modelParsed = await parseAllowedAiModelForDevice(deviceIdTrimmed, resolvedModel);
  if (!modelParsed.ok) {
    return apiError(modelParsed.error, HttpStatus.BAD_REQUEST, {
      pathname,
      code:
        modelParsed.reason === 'pro_required'
          ? ApiErrorCode.ProModelRequired
          : ApiErrorCode.InvalidModel,
    });
  }
  resolvedModel = modelParsed.model;

  const limitResult = await checkAndIncrement(deviceIdTrimmed, undefined, 1, {
    operation: 'digest',
    metadata: aiModelLedgerMetadata(resolvedModel, modelMode),
  });
  if (!limitResult.allowed) {
    return weeklyAiLimitExceededResponse(limitResult.usage);
  }

  await setAppForeground(deviceIdTrimmed);

  logAiRequest(aiOperation, { path: pathname });

  try {
    const result = await processDigest(payload, resolvedModel, req.headers.get('user-agent'));
    await updateAiUsageLedgerMetadata({
      deviceId: deviceIdTrimmed,
      operation: 'digest',
      entryId: limitResult.ledgerEntryId,
      metadata: aiModelResponseFields(resolvedModel),
    });
    return NextResponse.json({
      ...result,
      ...aiModelClientResponseFields(resolvedModel, modelMode),
    });
  } catch (err) {
    await decrement(deviceIdTrimmed, {
      operation: 'digest',
      metadata: { model: resolvedModel },
    });
    return apiError(err instanceof Error ? err.message : 'Digest generation failed', 503, {
      pathname,
      code: ApiErrorCode.ServiceUnavailable,
    });
  }
};
