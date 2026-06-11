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
import { estimateAskRoutingChars, parseAskPriorTurns } from '@/lib/ask-user-message';
import { sanitizeRecordingMarksForPrompt } from '@/lib/recording-marks-prompt';
import { aiModelResponseFields } from '@/lib/ai-model-display';
import { withDeduplication, getAskDeduplicationKey } from '@/lib/request-deduplication';
import {
  estimateSummaryTasksRoutingChars,
  resolveAutoAiModel,
  type AiModelMode,
} from '@/lib/ai-model-router';
import { setAppForeground } from '@/lib/push-tokens';
import { clampMessageTtlSeconds } from '@/lib/message-kv-ttl';
import { getAiWeeklyLimits } from '@/lib/app-config';
import { isProDevice } from '@/lib/pro-entitlement';
import { createAsk } from '@/services/ask.service';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export const maxDuration = 300;

type CreateAskBody = {
  id?: unknown;
  transcript?: unknown;
  question?: unknown;
  model?: unknown;
  modelMode?: unknown;
  routingContext?: unknown;
  summary?: unknown;
  tasks?: unknown;
  priorTurns?: unknown;
  recordingMarks?: unknown;
  messageTtlSeconds?: unknown;
};

export const POST = async (request: Request): Promise<NextResponse> => {
  const guard = await assertMobileAiRouteContext(request);
  if (!guard.ok) {
    return guard.response;
  }
  const { deviceId: deviceIdTrimmed, pathname, request: req, aiOperation } = guard.ctx;

  const body = await parseJsonBody<CreateAskBody>(req);

  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST, {
      pathname,
      code: ApiErrorCode.InvalidJson,
    });
  }

  const validationError = validateRequiredStrings([
    { value: body.id, name: 'id' },
    { value: body.transcript, name: 'transcript' },
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
    transcript,
    question,
    model,
    modelMode: rawModelMode,
    routingContext: rawRoutingContext,
    summary,
    tasks,
    priorTurns: rawPrior,
    recordingMarks: rawRecordingMarks,
    messageTtlSeconds: rawMessageTtl,
  } = body as {
    id: string;
    transcript: string;
    question: string;
    model: string;
    modelMode?: AiModelMode;
    routingContext?: { taskType?: unknown; transcriptChars?: unknown };
    summary?: string;
    tasks?: { text: string }[];
    priorTurns?: unknown;
    recordingMarks?: unknown;
    messageTtlSeconds?: unknown;
  };

  const messageTtlSeconds = clampMessageTtlSeconds(rawMessageTtl);

  const modelMode: AiModelMode = rawModelMode === 'auto' ? 'auto' : 'manual';
  const routingTaskType = rawRoutingContext?.taskType === 'summary_tasks' ? 'summary_tasks' : 'ask';

  const summaryStr =
    typeof summary === 'string' && summary.trim().length > 0 ? summary.trim() : undefined;
  const tasksList =
    Array.isArray(tasks) &&
    tasks.every(
      (t): t is { text: string } => t && typeof t === 'object' && typeof t.text === 'string',
    )
      ? tasks
      : undefined;

  const priorTurnsList = parseAskPriorTurns(rawPrior);
  const recordingMarksList = sanitizeRecordingMarksForPrompt(rawRecordingMarks);

  const routingChars =
    routingTaskType === 'summary_tasks'
      ? estimateSummaryTasksRoutingChars(transcript, undefined)
      : estimateAskRoutingChars(
          transcript,
          question,
          summaryStr,
          tasksList,
          priorTurnsList,
          recordingMarksList,
        );
  let resolvedModel =
    modelMode === 'auto'
      ? resolveAutoAiModel({
          taskType: routingTaskType,
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
    getAskDeduplicationKey(deviceIdTrimmed, id),
    () =>
      createAsk(
        id,
        transcript,
        question,
        resolvedModel,
        deviceIdTrimmed,
        summaryStr,
        tasksList,
        priorTurnsList,
        req.headers.get('user-agent'),
        messageTtlSeconds,
        recordingMarksList,
        aiLimitContext,
      ),
    10000,
  );

  if (!result.created && 'limitExceeded' in result && result.limitExceeded) {
    return weeklyAiLimitExceededResponse(result.usage);
  }

  if (!result.created) {
    return apiError('Ask with this id already exists', HttpStatus.CONFLICT, {
      pathname,
      code: ApiErrorCode.DuplicateId,
    });
  }

  const response = NextResponse.json({
    id,
    status: 'processing',
    ...aiModelResponseFields(resolvedModel),
    ...(result.syncToken && { syncToken: result.syncToken }),
  });

  if (result.syncToken) {
    response.headers.set(HEADER_SYNC_TOKEN, result.syncToken);
  }

  return response;
};
