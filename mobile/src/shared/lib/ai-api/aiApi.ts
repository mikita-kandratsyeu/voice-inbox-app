import { WEB_API_URL } from '@env';

import { fetchWithAuth } from '@/shared/lib/api-auth';
import { isString } from '@/shared/lib/type-guards';

export type AiProcessingOptions = {
  summaryStyle?: 'brief' | 'standard' | 'detailed';
  taskStrictness?: 'strict' | 'balanced' | 'soft';
  outputLanguage?: 'same' | 'ru' | 'en';
};

type AiApiRequestBody = {
  id: string;
  transcript: string;
  model: string;
  systemPrompt?: string;
  options?: AiProcessingOptions;
};

type AiApiSuccessResponse = {
  id: string;
  status: 'processing';
  syncToken?: string;
};

type AiApiLimitResponse = {
  error: string;
  usage: {
    used: number;
    limit: number;
    resetAt: string;
  };
};

export type AiApiResult =
  | { ok: true; data: AiApiSuccessResponse }
  | { ok: false; limitExceeded: true; usage: AiApiLimitResponse['usage'] }
  | { ok: false; limitExceeded?: false; error: string };

export type AiTask = {
  title: string;
  priority: 'high' | 'medium' | 'low';
  deadline: string | null;
};

export type RecordClassification = 'personal' | 'work' | 'meeting' | 'idea' | 'other';

export type AiProcessingResult = {
  summary: string;
  suggestedTitle?: string;
  tasks: AiTask[];
  tags: string[];
  classification?: RecordClassification;
  keyPhrases?: string[];
  nextSteps?: string[];
};

export type AiMessageResult =
  | { ok: true; result: AiProcessingResult }
  | { ok: false; error: string };

const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 120_000;

type MessageResponse =
  | { id: string; status: 'processing' }
  | {
      id: string;
      status: 'done';
      summary: string;
      suggestedTitle?: string;
      tasks: AiTask[];
      tags: string[];
      classification?: RecordClassification;
      keyPhrases?: string[];
      nextSteps?: string[];
    }
  | { id: string; status: 'error'; error: string };

export async function postAiMessage(body: AiApiRequestBody): Promise<AiApiResult> {
  const url = `${WEB_API_URL}/api/messages`;

  let response: Response;
  try {
    response = await fetchWithAuth(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Network error';
    if (__DEV__) console.warn('[AI] postAiMessage: fetch failed', { error: errorMsg, url });
    return { ok: false, error: errorMsg };
  }

  if (response.status === 429) {
    const json = (await response.json()) as AiApiLimitResponse;
    if (__DEV__) console.warn('[AI] postAiMessage: limit exceeded', json.usage);
    return { ok: false, limitExceeded: true, usage: json.usage };
  }

  if (!response.ok) {
    const text = await response.text();
    if (__DEV__)
      console.warn('[AI] postAiMessage: HTTP error', { status: response.status, body: text });
    return { ok: false, error: text || `HTTP ${response.status}` };
  }

  const data = (await response.json()) as AiApiSuccessResponse;

  return { ok: true, data };
}

export type AiUsage = {
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
  resetAtUtc: string;
};

export async function getAiUsage(): Promise<AiUsage | null> {
  try {
    const response = await fetchWithAuth(`${WEB_API_URL}/api/ai-usage`, { method: 'GET' });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as AiUsage;
    return data;
  } catch {
    return null;
  }
}

export type ClaimAiBonusResult =
  | { ok: true; usage: AiUsage }
  | { ok: false; error: string; cooldown?: boolean; retryAfterSeconds?: number };

export async function claimAiBonus(): Promise<ClaimAiBonusResult> {
  try {
    const response = await fetchWithAuth(`${WEB_API_URL}/api/ai-usage/bonus`, { method: 'POST' });

    if (response.status === 429) {
      const raw = response.headers.get('Retry-After');
      const parsed = raw ? parseInt(raw, 10) : NaN;
      const retryAfterSeconds = Number.isFinite(parsed) && parsed > 0 ? parsed : 900;
      return {
        ok: false,
        error: 'Bonus claim is on cooldown',
        cooldown: true,
        retryAfterSeconds,
      };
    }

    if (!response.ok) {
      const text = await response.text();
      try {
        const parsed = JSON.parse(text) as { error?: string };
        if (isString(parsed.error) && parsed.error) {
          return { ok: false, error: parsed.error };
        }
      } catch {
        if (__DEV__) console.warn('[AI] claimAiBonus: JSON parse error', { text });
      }
      return { ok: false, error: text || `HTTP ${response.status}` };
    }

    const usage = (await response.json()) as AiUsage;
    return { ok: true, usage };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return { ok: false, error: message };
  }
}

export async function pollAiMessage(id: string, syncToken?: string): Promise<AiMessageResult> {
  const headers: Record<string, string> = {};
  if (syncToken) {
    headers['x-upstash-sync-token'] = syncToken;
  }

  const url = `${WEB_API_URL}/api/messages/${id}`;
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    let response: Response;
    try {
      response = await fetchWithAuth(url, { headers });
    } catch (err) {
      if (__DEV__) console.warn('[AI] pollAiMessage: fetch failed', { id, error: String(err) });
      continue;
    }

    if (!response.ok) {
      const text = await response.text();
      if (__DEV__)
        console.warn('[AI] pollAiMessage: HTTP error', { id, status: response.status, body: text });
      continue;
    }

    const msg = (await response.json()) as MessageResponse;

    if (msg.status === 'done') {
      return {
        ok: true,
        result: {
          summary: msg.summary,
          tasks: msg.tasks,
          tags: msg.tags ?? [],
          ...('suggestedTitle' in msg &&
          isString((msg as { suggestedTitle?: string }).suggestedTitle) &&
          (msg as { suggestedTitle: string }).suggestedTitle.trim()
            ? { suggestedTitle: (msg as { suggestedTitle: string }).suggestedTitle.trim() }
            : {}),
          ...(msg.classification && { classification: msg.classification }),
          ...(msg.keyPhrases && { keyPhrases: msg.keyPhrases }),
          ...(msg.nextSteps && { nextSteps: msg.nextSteps }),
        },
      };
    }

    if (msg.status === 'error') {
      if (__DEV__) console.warn('[AI] pollAiMessage: server error', { id, error: msg.error });
      return { ok: false, error: msg.error };
    }
  }

  if (__DEV__) console.warn('[AI] pollAiMessage: timeout', { id });
  return { ok: false, error: 'Timeout waiting for AI result' };
}
