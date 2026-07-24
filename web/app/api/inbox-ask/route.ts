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
  estimateCorpusNotesPayloadChars,
  INBOX_ASK_MAX_NOTES,
  INBOX_ASK_MAX_PAYLOAD_CHARS,
  parseCorpusNotes,
} from '@/lib/corpus-notes-prompt';
import {
  estimateInboxAskRoutingChars,
  parseInboxAskPriorTurns,
} from '@/lib/inbox-ask-user-message';
import { aiModelClientResponseFields } from '@/lib/ai-model-display';
import { withDeduplication, getInboxAskDeduplicationKey } from '@/lib/request-deduplication';
import { resolveAutoAiModel, type AiModelMode } from '@/lib/ai-model-router';
import { setAppForeground } from '@/lib/push-tokens';
import { clampMessageTtlSeconds } from '@/lib/message-kv-ttl';
import { getAiWeeklyLimits } from '@/lib/app-config';
import { isProDevice } from '@/lib/pro-entitlement';
import { createInboxAsk } from '@/services/inbox-ask.service';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export const maxDuration = 300;

type CreateInboxAskBody = {
  id?: unknown;
  corpusNotes?: unknown;
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

  const body = await parseJsonBody<CreateInboxAskBody>(req);

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

  const corpusNotes = parseCorpusNotes(body.corpusNotes);
  if (!corpusNotes?.length) {
    return apiError(
      'corpusNotes must contain 1-8 items with usable context',
      HttpStatus.BAD_REQUEST,
      {
        pathname,
        code: ApiErrorCode.ValidationError,
      },
    );
  }
  if (corpusNotes.length > INBOX_ASK_MAX_NOTES) {
    return apiError(`corpusNotes exceeds max ${INBOX_ASK_MAX_NOTES}`, HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.ValidationError,
    });
  }

  const payloadChars = estimateCorpusNotesPayloadChars(corpusNotes);
  if (payloadChars > INBOX_ASK_MAX_PAYLOAD_CHARS) {
    return apiError(
      `corpusNotes payload exceeds ${INBOX_ASK_MAX_PAYLOAD_CHARS} chars`,
      HttpStatus.BAD_REQUEST,
      {
        pathname,
        code: ApiErrorCode.ValidationError,
      },
    );
  }

  const messageTtlSeconds = clampMessageTtlSeconds(rawMessageTtl);
  const modelMode: AiModelMode = rawModelMode === 'auto' ? 'auto' : 'manual';
  const priorTurnsList = parseInboxAskPriorTurns(rawPrior);

  const routingChars = estimateInboxAskRoutingChars(corpusNotes, question, priorTurnsList);
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
    getInboxAskDeduplicationKey(deviceIdTrimmed, id, question),
    () =>
      createInboxAsk(
        id,
        corpusNotes,
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
    return apiError('Inbox ask with this id already exists', HttpStatus.CONFLICT, {
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
