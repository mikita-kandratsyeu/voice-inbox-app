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
import { setAppForeground } from '@/lib/push-tokens';
import { createAsk } from '@/services/ask.service';
import { NextResponse } from 'next/server';

type CreateAskBody = {
  id?: unknown;
  transcript?: unknown;
  question?: unknown;
  model?: unknown;
  summary?: unknown;
  tasks?: unknown;
  priorTurns?: unknown;
};

const ASK_PRIOR_TURNS_MAX = 20;
const ASK_PRIOR_QUESTION_MAX_CHARS = 6000;
const ASK_PRIOR_ANSWER_MAX_CHARS = 16_000;

function parsePriorTurns(raw: unknown): { question: string; answer: string }[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: { question: string; answer: string }[] = [];
  for (const item of raw.slice(-ASK_PRIOR_TURNS_MAX)) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const q = typeof o.question === 'string' ? o.question.replace(/\s+/g, ' ').trim() : '';
    const a = typeof o.answer === 'string' ? o.answer.replace(/\s+/g, ' ').trim() : '';
    if (!q || !a) continue;
    out.push({
      question: q.slice(0, ASK_PRIOR_QUESTION_MAX_CHARS),
      answer: a.slice(0, ASK_PRIOR_ANSWER_MAX_CHARS),
    });
  }
  return out.length ? out : undefined;
}

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
    summary,
    tasks,
    priorTurns: rawPrior,
  } = body as {
    id: string;
    transcript: string;
    question: string;
    model: string;
    summary?: string;
    tasks?: { text: string }[];
    priorTurns?: unknown;
  };

  const modelError = validateAllowedModel(model);
  if (modelError) {
    return apiError(modelError, HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const summaryStr =
    typeof summary === 'string' && summary.trim().length > 0 ? summary.trim() : undefined;
  const tasksList =
    Array.isArray(tasks) &&
    tasks.every(
      (t): t is { text: string } => t && typeof t === 'object' && typeof t.text === 'string',
    )
      ? tasks
      : undefined;

  const priorTurnsList = parsePriorTurns(rawPrior);

  await setAppForeground(deviceIdTrimmed);

  const result = await createAsk(
    id,
    transcript,
    question,
    model,
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
