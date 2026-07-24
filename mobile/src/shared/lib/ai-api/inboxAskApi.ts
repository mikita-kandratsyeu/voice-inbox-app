import { getWebApiUrl } from '@/shared/config/runtimeConfig';
import type {
  AskAnswerKind,
  AskEvidence,
  InboxAskToolCall,
  InboxAskToolResult,
  InboxAskToolStep,
} from '@/shared/lib/ai-core/types';
import type { CorpusNoteForPrompt } from '@/shared/lib/ai-core/types';
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

type InboxAskApiRequestBody = {
  id: string;
  corpusNotes: CorpusNoteForPrompt[];
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

const INBOX_ASK_API_PRIOR_TURNS_MAX = 6;
const INBOX_ASK_API_PRIOR_QUESTION_MAX_CHARS = 800;
const INBOX_ASK_API_PRIOR_ANSWER_MAX_CHARS = 2000;

function sanitizePriorTurnsForInboxAskApi(
  turns: { question: string; answer: string }[],
): { question: string; answer: string }[] {
  const out: { question: string; answer: string }[] = [];
  for (const turn of turns.slice(-INBOX_ASK_API_PRIOR_TURNS_MAX)) {
    const question = turn.question.replace(/\s+/g, ' ').trim();
    const answer = turn.answer.replace(/\s+/g, ' ').trim();
    if (!question || !answer) continue;
    out.push({
      question: question.slice(0, INBOX_ASK_API_PRIOR_QUESTION_MAX_CHARS),
      answer: answer.slice(0, INBOX_ASK_API_PRIOR_ANSWER_MAX_CHARS),
    });
  }
  return out;
}

type InboxAskApiSuccessResponse = {
  id: string;
  status: 'processing';
  model?: string;
  syncToken?: string;
  pollExpiresAt?: string;
};

type InboxAskApiLimitResponse = {
  error: string;
  usage: {
    used: number;
    limit: number;
    resetAt: string;
  };
};

export type InboxAskApiResult =
  | { ok: true; data: InboxAskApiSuccessResponse }
  | { ok: false; limitExceeded: true; usage: InboxAskApiLimitResponse['usage'] }
  | { ok: false; limitExceeded?: false; error: string };

export type InboxAskMessageResult =
  | {
      ok: true;
      status: 'done';
      result: {
        answer: string;
        answerKind?: AskAnswerKind;
        items?: string[];
        suggestedFollowUps?: string[];
        interpretations?: string[];
        evidence?: AskEvidence[];
        model?: string;
        toolSteps?: InboxAskToolStep[];
      };
    }
  | {
      ok: true;
      status: 'needs_tool';
      toolCall: InboxAskToolCall;
      toolSteps?: InboxAskToolStep[];
      syncToken?: string;
    }
  | { ok: false; error: string };

type InboxAskPollSuccess = Extract<InboxAskMessageResult, { ok: true }>;

type InboxAskResponse =
  | { id: string; status: 'processing'; model?: string }
  | {
      id: string;
      status: 'needs_tool';
      toolCall: InboxAskToolCall;
      toolSteps?: InboxAskToolStep[];
      model?: string;
    }
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
      toolSteps?: InboxAskToolStep[];
    }
  | { id: string; status: 'error'; error: string; model?: string };

export async function postInboxAskQuestion(
  body: InboxAskApiRequestBody,
  options?: AiFetchOptions,
): Promise<InboxAskApiResult> {
  const url = `${getWebApiUrl()}/api/inbox-ask`;

  if (options?.signal?.aborted) {
    return aiRequestCancelledFailure();
  }

  const priorSanitized = body.priorTurns?.length
    ? sanitizePriorTurnsForInboxAskApi(body.priorTurns)
    : undefined;
  const payload: InboxAskApiRequestBody = {
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
        ...headersForAiOperation('inbox_ask'),
      },
      body: JSON.stringify(payload),
      signal: options?.signal,
    });
  } catch (err) {
    if (options?.signal?.aborted || isAbortLikeError(err)) {
      return aiRequestCancelledFailure();
    }
    const errorMsg = err instanceof Error ? err.message : 'Network error';
    diagWarn('[AI] postInboxAskQuestion: fetch failed', { error: errorMsg, url });
    return { ok: false, error: errorMsg };
  }

  if (response.status === 429) {
    const limitBody = await readResponseJson(response);
    if (!limitBody.ok) {
      return { ok: false, error: limitBody.error };
    }
    const json = limitBody.data as InboxAskApiLimitResponse;
    diagWarn('[AI] postInboxAskQuestion: limit exceeded', json.usage);
    return { ok: false, limitExceeded: true, usage: json.usage };
  }

  if (!response.ok) {
    const text = await response.text();
    devWarn('[AI] postInboxAskQuestion: HTTP error', { status: response.status, body: text });
    return { ok: false, error: text || `HTTP ${response.status}` };
  }

  const successBody = await readResponseJson(response);
  if (!successBody.ok) {
    return { ok: false, error: successBody.error };
  }

  const data = successBody.data as InboxAskApiSuccessResponse;
  requestAiUsageRefresh();

  return { ok: true, data };
}

export async function pollInboxAskResult(
  id: string,
  syncToken?: string,
  options?: AiFetchOptions & { pollExpiresAt?: string },
): Promise<InboxAskMessageResult> {
  const headers: Record<string, string> = {};
  if (syncToken) {
    headers['x-upstash-sync-token'] = syncToken;
  }

  const url = `${getWebApiUrl()}/api/inbox-ask/${id}`;

  const poll = await pollGetLoop<InboxAskPollSuccess>(
    url,
    (json) => {
      const msg = json as InboxAskResponse;
      if (msg.status === 'done') {
        return {
          ok: true,
          result: {
            ok: true,
            status: 'done',
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
              ...(msg.toolSteps?.length ? { toolSteps: msg.toolSteps } : {}),
            },
          },
        };
      }

      if (msg.status === 'needs_tool') {
        return {
          ok: true,
          result: {
            ok: true,
            status: 'needs_tool',
            toolCall: msg.toolCall,
            ...(msg.toolSteps?.length ? { toolSteps: msg.toolSteps } : {}),
          },
        };
      }

      if (msg.status === 'error') {
        diagWarn('[AI] pollInboxAskResult: server error', { id, error: msg.error });
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

  if (!poll.ok) return poll;
  return poll.result;
}

export async function postInboxAskToolResult(
  id: string,
  result: InboxAskToolResult,
  options?: AiFetchOptions,
): Promise<InboxAskApiResult> {
  const url = `${getWebApiUrl()}/api/inbox-ask/${id}/tool-result`;

  if (options?.signal?.aborted) {
    return aiRequestCancelledFailure();
  }

  let response: Response;
  try {
    response = await fetchWithAuth(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headersForAiOperation('inbox_ask'),
      },
      body: JSON.stringify(result),
      signal: options?.signal,
    });
  } catch (err) {
    if (options?.signal?.aborted || isAbortLikeError(err)) {
      return aiRequestCancelledFailure();
    }
    const errorMsg = err instanceof Error ? err.message : 'Network error';
    diagWarn('[AI] postInboxAskToolResult: fetch failed', { error: errorMsg, url });
    return { ok: false, error: errorMsg };
  }

  if (!response.ok) {
    const text = await response.text();
    devWarn('[AI] postInboxAskToolResult: HTTP error', {
      status: response.status,
      body: text,
    });
    return { ok: false, error: text || `HTTP ${response.status}` };
  }

  const successBody = await readResponseJson(response);
  if (!successBody.ok) {
    return { ok: false, error: successBody.error };
  }

  return { ok: true, data: successBody.data as InboxAskApiSuccessResponse };
}
