import { getWebApiUrl } from '@/shared/config/runtimeConfig';
import { fetchWithAuth } from '@/shared/lib/api-auth';

import { isString } from '../type-guards';

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
  | { ok: true; result: { answer: string; model?: string } }
  | { ok: false; error: string };

const POLL_TIMEOUT_MS = 120_000;
const POLL_BACKOFF_INITIAL_MS = 2_000;
const POLL_BACKOFF_CAP_MS = 8_000;

type AskResponse =
  | { id: string; status: 'processing'; model?: string }
  | { id: string; status: 'done'; answer: string; model?: string }
  | { id: string; status: 'error'; error: string; model?: string };

export async function postAskQuestion(body: AskApiRequestBody): Promise<AskApiResult> {
  const url = `${getWebApiUrl()}/api/ask`;

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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Network error';
    if (__DEV__) console.warn('[AI] postAskQuestion: fetch failed', { error: errorMsg, url });
    return { ok: false, error: errorMsg };
  }

  if (response.status === 429) {
    const json = (await response.json()) as AskApiLimitResponse;
    if (__DEV__) console.warn('[AI] postAskQuestion: limit exceeded', json.usage);
    return { ok: false, limitExceeded: true, usage: json.usage };
  }

  if (!response.ok) {
    const text = await response.text();
    if (__DEV__)
      console.warn('[AI] postAskQuestion: HTTP error', { status: response.status, body: text });
    return { ok: false, error: text || `HTTP ${response.status}` };
  }

  const data = (await response.json()) as AskApiSuccessResponse;

  return { ok: true, data };
}

export async function pollAskResult(id: string, syncToken?: string): Promise<AskMessageResult> {
  const headers: Record<string, string> = {};
  if (syncToken) {
    headers['x-upstash-sync-token'] = syncToken;
  }

  const url = `${getWebApiUrl()}/api/ask/${id}`;
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let intervalMs = POLL_BACKOFF_INITIAL_MS;

  while (Date.now() < deadline) {
    await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
    intervalMs = Math.min(intervalMs * 2, POLL_BACKOFF_CAP_MS);

    let response: Response;
    try {
      response = await fetchWithAuth(url, { headers });
    } catch (err) {
      if (__DEV__) console.warn('[AI] pollAskResult: fetch failed', { id, error: String(err) });
      continue;
    }

    if (!response.ok) {
      const text = await response.text();
      if (__DEV__)
        console.warn('[AI] pollAskResult: HTTP error', { id, status: response.status, body: text });
      continue;
    }

    const msg = (await response.json()) as AskResponse;

    if (msg.status === 'done') {
      return {
        ok: true,
        result: {
          answer: msg.answer,
          ...(isString(msg.model) && msg.model.trim() ? { model: msg.model.trim() } : {}),
        },
      };
    }

    if (msg.status === 'error') {
      if (__DEV__) console.warn('[AI] pollAskResult: server error', { id, error: msg.error });
      return { ok: false, error: msg.error };
    }
  }

  if (__DEV__) console.warn('[AI] pollAskResult: timeout', { id });
  return { ok: false, error: 'Timeout waiting for AI result' };
}
