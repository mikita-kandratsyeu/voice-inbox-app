import { getWebApiUrl } from '@/shared/config/runtimeConfig';
import type { AskAnswerKind, AskEvidence } from '@/shared/lib/ai-core/types';
import { requestAiUsageRefresh } from '@/shared/lib/aiUsageRefresh';
import { fetchWithAuth } from '@/shared/lib/api-auth';
import { devWarn, diagWarn } from '@/shared/lib/appLogger';

import { isString } from '../type-guards';
import { type AiFetchOptions, aiRequestCancelledFailure, isAbortLikeError } from './abort';
import { headersForAiOperation } from './aiOperation';
import { AI_POLL_TIMEOUT_MS } from './constants';
import { pollLoopOptionsFromAcceptedJob } from './pollDeadline';
import { pollGetLoop } from './pollGetLoop';
import { readResponseJson } from './responseJson';

type GeneralAskApiRequestBody = {
  id: string;
  question: string;
  model: string;
  modelMode?: 'manual' | 'auto';
  routingContext?: {
    taskType?: 'ask';
    routingChars?: number;
  };
  priorTurns?: { question: string; answer: string }[];
  messageTtlSeconds?: number;
};

const GENERAL_ASK_API_PRIOR_TURNS_MAX = 6;
const GENERAL_ASK_API_PRIOR_QUESTION_MAX_CHARS = 800;
const GENERAL_ASK_API_PRIOR_ANSWER_MAX_CHARS = 2000;

function sanitizePriorTurnsForGeneralAskApi(
  turns: { question: string; answer: string }[],
): { question: string; answer: string }[] {
  const out: { question: string; answer: string }[] = [];
  for (const turn of turns.slice(-GENERAL_ASK_API_PRIOR_TURNS_MAX)) {
    const question = turn.question.replace(/\s+/g, ' ').trim();
    const answer = turn.answer.replace(/\s+/g, ' ').trim();
    if (!question || !answer) continue;
    out.push({
      question: question.slice(0, GENERAL_ASK_API_PRIOR_QUESTION_MAX_CHARS),
      answer: answer.slice(0, GENERAL_ASK_API_PRIOR_ANSWER_MAX_CHARS),
    });
  }
  return out;
}

type GeneralAskApiSuccessResponse = {
  id: string;
  status: 'processing';
  model?: string;
  syncToken?: string;
  pollExpiresAt?: string;
};

type GeneralAskApiLimitResponse = {
  error: string;
  usage: {
    used: number;
    limit: number;
    resetAt: string;
  };
};

export type GeneralAskApiResult =
  | { ok: true; data: GeneralAskApiSuccessResponse }
  | { ok: false; limitExceeded: true; usage: GeneralAskApiLimitResponse['usage'] }
  | { ok: false; limitExceeded?: false; error: string };

export type GeneralAskMessageResult =
  | {
      ok: true;
      result: {
        answer: string;
        answerKind?: AskAnswerKind;
        items?: string[];
        suggestedFollowUps?: string[];
        interpretations?: string[];
        evidence?: AskEvidence[];
        model?: string;
      };
    }
  | { ok: false; error: string };

type GeneralAskResponse =
  | { id: string; status: 'processing'; model?: string }
  | {
      id: string;
      status: 'done';
      answer: string;
      answerKind?: AskAnswerKind;
      items?: string[];
      suggestedFollowUps?: string[];
      interpretations?: string[];
      evidence?: AskEvidence[];
      model?: string;
    }
  | { id: string; status: 'error'; error: string; model?: string };

export async function postGeneralAskQuestion(
  body: GeneralAskApiRequestBody,
  options?: AiFetchOptions,
): Promise<GeneralAskApiResult> {
  const url = `${getWebApiUrl()}/api/general-ask`;

  if (options?.signal?.aborted) {
    return aiRequestCancelledFailure();
  }

  const priorSanitized = body.priorTurns?.length
    ? sanitizePriorTurnsForGeneralAskApi(body.priorTurns)
    : undefined;
  const payload: GeneralAskApiRequestBody = {
    ...body,
    ...(priorSanitized?.length ? { priorTurns: priorSanitized } : {}),
  };
  if (payload.priorTurns?.length === 0) {
    delete payload.priorTurns;
  }

  let response: Response;
  try {
    response = await fetchWithAuth(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headersForAiOperation('general_ask'),
      },
      body: JSON.stringify(payload),
      signal: options?.signal,
    });
  } catch (err) {
    if (options?.signal?.aborted || isAbortLikeError(err)) {
      return aiRequestCancelledFailure();
    }
    const errorMsg = err instanceof Error ? err.message : 'Network error';
    diagWarn('[AI] postGeneralAskQuestion: fetch failed', { error: errorMsg, url });
    return { ok: false, error: errorMsg };
  }

  if (response.status === 429) {
    const limitBody = await readResponseJson(response);
    if (!limitBody.ok) {
      return { ok: false, error: limitBody.error };
    }
    const json = limitBody.data as GeneralAskApiLimitResponse;
    diagWarn('[AI] postGeneralAskQuestion: limit exceeded', json.usage);
    return { ok: false, limitExceeded: true, usage: json.usage };
  }

  if (!response.ok) {
    const text = await response.text();
    devWarn('[AI] postGeneralAskQuestion: HTTP error', { status: response.status, body: text });
    return { ok: false, error: text || `HTTP ${response.status}` };
  }

  const successBody = await readResponseJson(response);
  if (!successBody.ok) {
    return { ok: false, error: successBody.error };
  }

  const data = successBody.data as GeneralAskApiSuccessResponse;
  requestAiUsageRefresh();

  return { ok: true, data };
}

export async function pollGeneralAskResult(
  id: string,
  syncToken?: string,
  options?: AiFetchOptions & { pollExpiresAt?: string },
): Promise<GeneralAskMessageResult> {
  const headers: Record<string, string> = {};
  if (syncToken) {
    headers['x-upstash-sync-token'] = syncToken;
  }

  const url = `${getWebApiUrl()}/api/general-ask/${id}`;

  const result = await pollGetLoop<{
    answer: string;
    answerKind?: AskAnswerKind;
    items?: string[];
    suggestedFollowUps?: string[];
    interpretations?: string[];
    evidence?: AskEvidence[];
    model?: string;
  }>(
    url,
    (json) => {
      const msg = json as GeneralAskResponse;
      if (msg.status === 'done') {
        return {
          ok: true,
          result: {
            answer: msg.answer,
            ...(msg.answerKind ? { answerKind: msg.answerKind } : {}),
            ...(msg.items?.length ? { items: msg.items } : {}),
            ...(msg.suggestedFollowUps?.length
              ? { suggestedFollowUps: msg.suggestedFollowUps }
              : {}),
            ...(msg.interpretations?.length ? { interpretations: msg.interpretations } : {}),
            ...(msg.evidence?.length ? { evidence: msg.evidence } : {}),
            ...(isString(msg.model) && msg.model.trim() ? { model: msg.model.trim() } : {}),
          },
        };
      }

      if (msg.status === 'error') {
        diagWarn('[AI] pollGeneralAskResult: server error', { id, error: msg.error });
        return { ok: false, error: msg.error };
      }

      return 'processing';
    },
    {
      ...options,
      headers,
      jobType: 'ask',
      ...pollLoopOptionsFromAcceptedJob(
        { pollExpiresAt: options?.pollExpiresAt },
        AI_POLL_TIMEOUT_MS,
      ),
    },
  );

  if (!result.ok && result.error === 'Timeout waiting for AI result') {
    diagWarn('[AI] pollGeneralAskResult: timeout', { id });
  }

  requestAiUsageRefresh();

  return result;
}
