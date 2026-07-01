import { ApiErrorCode } from '@/lib/api-error-codes';
import {
  apiError,
  HttpStatus,
  parseJsonBody,
  parseAllowedAiModelForDevice,
  validateRequiredStrings,
  weeklyAiLimitExceededResponse,
} from '@/lib/api';
import { HEADER_SYNC_TOKEN } from '@/config/constants';
import { assertMobileAiRouteContext } from '@/lib/mobile-ai-route';
import { logAiRequest } from '@/lib/ai-operation';
import {
  estimateGeneralAskRoutingChars,
  parseGeneralAskPriorTurns,
} from '@/lib/general-ask-user-message';
import { aiModelClientResponseFields } from '@/lib/ai-model-display';
import { withDeduplication, getGeneralAskDeduplicationKey } from '@/lib/request-deduplication';
import { resolveAutoAiModel, type AiModelMode } from '@/lib/ai-model-router';
import { setAppForeground } from '@/lib/push-tokens';
import { clampMessageTtlSeconds } from '@/lib/message-kv-ttl';
import { getAiWeeklyLimits } from '@/lib/app-config';
import { isProDevice } from '@/lib/pro-entitlement';
import { createGeneralAsk } from '@/services/general-ask.service';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export const maxDuration = 300;

type CreateGeneralAskBody = {
  id?: unknown;
  question?: unknown;
  model?: unknown;
  modelMode?: unknown;
  priorTurns?: unknown;
  messageTtlSeconds?: unknown;
};

export const POST = async (request: Request): Promise<NextResponse> => {
  const guard = await assertMobileAiRouteContext(request);
  if (!guard.ok) {
    return guard.response;
  }
  const { deviceId: deviceIdTrimmed, pathname, request: req, aiOperation } = guard.ctx;

  const body = await parseJsonBody<CreateGeneralAskBody>(req);

  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.InvalidJson,
    });
  }

  const validationError = validateRequiredStrings([
    { value: body.id, name: 'id' },
    { value: body.question, name: 'question' },
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
    question,
    model,
    modelMode: rawModelMode,
    priorTurns: rawPrior,
    messageTtlSeconds: rawMessageTtl,
  } = body as {
    id: string;
    question: string;
    model: string;
    modelMode?: AiModelMode;
    priorTurns?: unknown;
    messageTtlSeconds?: unknown;
  };

  const messageTtlSeconds = clampMessageTtlSeconds(rawMessageTtl);
  const modelMode: AiModelMode = rawModelMode === 'auto' ? 'auto' : 'manual';
  const priorTurnsList = parseGeneralAskPriorTurns(rawPrior);

  const routingChars = estimateGeneralAskRoutingChars(question, priorTurnsList);
  let resolvedModel =
    modelMode === 'auto'
      ? resolveAutoAiModel({
          taskType: 'ask',
          routingChars,
        })
      : model;

  const [isPro, weeklyLimits] = await Promise.all([
    isProDevice(deviceIdTrimmed),
    getAiWeeklyLimits(),
  ]);
  const aiLimitContext = { isPro, weeklyLimits };

  const modelParsed = await parseAllowedAiModelForDevice(deviceIdTrimmed, resolvedModel, {
    isPro,
  });
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

  await setAppForeground(deviceIdTrimmed);

  logAiRequest(aiOperation, { path: pathname, messageId: id });

  const result = await withDeduplication(
    getGeneralAskDeduplicationKey(deviceIdTrimmed, id, question),
    () =>
      createGeneralAsk(
        id,
        question,
        resolvedModel,
        deviceIdTrimmed,
        priorTurnsList,
        req.headers.get('user-agent'),
        messageTtlSeconds,
        aiLimitContext,
        modelMode,
      ),
    60000,
  );

  if (!result.created && 'limitExceeded' in result && result.limitExceeded) {
    return weeklyAiLimitExceededResponse(result.usage);
  }

  if (!result.created) {
    return apiError('General ask with this id already exists', HttpStatus.CONFLICT, {
      pathname,
      code: ApiErrorCode.DuplicateId,
    });
  }

  const response = NextResponse.json({
    id,
    status: 'processing',
    pollExpiresAt: result.pollExpiresAt,
    ...aiModelClientResponseFields(resolvedModel, modelMode),
    ...(result.syncToken && { syncToken: result.syncToken }),
  });

  if (result.syncToken) {
    response.headers.set(HEADER_SYNC_TOKEN, result.syncToken);
  }

  return response;
};
