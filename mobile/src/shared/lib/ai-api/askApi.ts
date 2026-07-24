import { getWebApiUrl } from '@/shared/config/runtimeConfig';
import type {
  AskAnswerKind,
  AskEvidence,
  AskLinkedNoteForPrompt,
} from '@/shared/lib/ai-core/types';
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

type AskApiRequestBody = {
  id: string;
  transcript: string;
  question: string;
  model: string;
  modelMode?: 'manual' | 'auto';
  routingContext?: {
    taskType?: 'summary_tasks' | 'ask';
    transcriptChars?: number;
  };
  summary?: string;
  tasks?: { text: string }[];
  priorTurns?: { question: string; answer: string }[];
  recordingMarks?: { offsetMs: number; label: string }[];
  linkedNotes?: AskLinkedNoteForPrompt[];
  /** Server clamps to 300–3600; omit for API default (1 hour). */
  messageTtlSeconds?: number;
};

const ASK_API_PRIOR_TURNS_MAX = 20;
const ASK_API_PRIOR_QUESTION_MAX_CHARS = 6000;
const ASK_API_PRIOR_ANSWER_MAX_CHARS = 16_000;

function sanitizePriorTurnsForAskApi(
  turns: { question: string; answer: string }[],
): { question: string; answer: string }[] {
  const out: { question: string; answer: string }[] = [];
  for (const t of turns.slice(-ASK_API_PRIOR_TURNS_MAX)) {
    const q = t.question.replace(/\s+/g, ' ').trim();
    const a = t.answer.replace(/\s+/g, ' ').trim();
    if (!q || !a) continue;
    out.push({
      question: q.slice(0, ASK_API_PRIOR_QUESTION_MAX_CHARS),
      answer: a.slice(0, ASK_API_PRIOR_ANSWER_MAX_CHARS),
    });
  }
  return out;
}

type AskApiSuccessResponse = {
  id: string;
  status: 'processing';
  model?: string;
  syncToken?: string;
  pollExpiresAt?: string;
};

type AskApiLimitResponse = {
  error: string;
  usage: {
    used: number;
    limit: number;
    resetAt: string;
  };
};

export type AskApiResult =
  | { ok: true; data: AskApiSuccessResponse }
  | { ok: false; limitExceeded: true; usage: AskApiLimitResponse['usage'] }
  | { ok: false; limitExceeded?: false; error: string };

export type AskMessageResult =
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

type AskResponse =
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

export async function postAskQuestion(
  body: AskApiRequestBody,
  options?: AiFetchOptions,
): Promise<AskApiResult> {
  const url = `${getWebApiUrl()}/api/ask`;

  if (options?.signal?.aborted) {
    return aiRequestCancelledFailure();
  }

  const priorSanitized = body.priorTurns?.length
    ? sanitizePriorTurnsForAskApi(body.priorTurns)
    : undefined;
  const payload: AskApiRequestBody = {
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
        ...headersForAiOperation('transcript_ask'),
      },
      body: JSON.stringify(payload),
      signal: options?.signal,
    });
  } catch (err) {
    if (options?.signal?.aborted || isAbortLikeError(err)) {
      return aiRequestCancelledFailure();
    }
    const errorMsg = err instanceof Error ? err.message : 'Network error';
    diagWarn('[AI] postAskQuestion: fetch failed', { error: errorMsg, url });
    return { ok: false, error: errorMsg };
  }

  if (response.status === 429) {
    const limitBody = await readResponseJson(response);
    if (!limitBody.ok) {
      return { ok: false, error: limitBody.error };
    }
    const json = limitBody.data as AskApiLimitResponse;
    diagWarn('[AI] postAskQuestion: limit exceeded', json.usage);
    return { ok: false, limitExceeded: true, usage: json.usage };
  }

  if (!response.ok) {
    const text = await response.text();
    devWarn('[AI] postAskQuestion: HTTP error', { status: response.status, body: text });
    return { ok: false, error: text || `HTTP ${response.status}` };
  }

  const successBody = await readResponseJson(response);
  if (!successBody.ok) {
    return { ok: false, error: successBody.error };
  }

  const data = successBody.data as AskApiSuccessResponse;
  requestAiUsageRefresh();

  return { ok: true, data };
}

export async function pollAskResult(
  id: string,
  syncToken?: string,
  options?: AiFetchOptions & { pollExpiresAt?: string },
): Promise<AskMessageResult> {
  const headers: Record<string, string> = {};
  if (syncToken) {
    headers['x-upstash-sync-token'] = syncToken;
  }

  const url = `${getWebApiUrl()}/api/ask/${id}`;

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
      const msg = json as AskResponse;
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
        diagWarn('[AI] pollAskResult: server error', { id, error: msg.error });
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
    diagWarn('[AI] pollAskResult: timeout', { id });
  }

  requestAiUsageRefresh();

  return result;
}
