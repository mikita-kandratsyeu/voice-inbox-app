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
import { HEADER_DEVICE_ID, HEADER_SYNC_TOKEN } from '@/config/constants';
import { estimateAskRoutingChars, parseAskPriorTurns } from '@/lib/ask-user-message';
import {
  estimateSummaryTasksRoutingChars,
  resolveAutoAiModel,
  type AiModelMode,
} from '@/lib/ai-model-router';
import { setAppForeground } from '@/lib/push-tokens';
import { createAsk } from '@/services/ask.service';
import { NextResponse } from 'next/server';

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

  const body = await parseJsonBody<CreateAskBody>(request);

  if (!body) {
    return apiError('Invalid JSON body', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const validationError = validateRequiredStrings([
    { value: body.id, name: 'id' },
    { value: body.transcript, name: 'transcript' },
    { value: body.question, name: 'question' },
    { value: body.model, name: 'model' },
  ]);
  if (validationError) {
    return apiError(validationError, HttpStatus.BAD_REQUEST, { pathname: path });
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
  };

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

  const routingChars =
    routingTaskType === 'summary_tasks'
      ? estimateSummaryTasksRoutingChars(transcript, undefined)
      : estimateAskRoutingChars(transcript, question, summaryStr, tasksList, priorTurnsList);
  const resolvedModel =
    modelMode === 'auto'
      ? resolveAutoAiModel({
          taskType: routingTaskType,
          routingChars,
        })
      : model;

  const modelError = validateAllowedModel(resolvedModel);
  if (modelError) {
    return apiError(modelError, HttpStatus.BAD_REQUEST, { pathname: path });
  }

  await setAppForeground(deviceIdTrimmed);

  const result = await createAsk(
    id,
    transcript,
    question,
    resolvedModel,
    deviceIdTrimmed,
    summaryStr,
    tasksList,
    priorTurnsList,
    request.headers.get('user-agent'),
  );

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
    return apiError('Ask with this id already exists', HttpStatus.CONFLICT, { pathname: path });
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
