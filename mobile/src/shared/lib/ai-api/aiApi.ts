import { getWebApiUrl } from '@/shared/config/runtimeConfig';
import { fetchWithAuth } from '@/shared/lib/api-auth';
import { isNumber, isString } from '@/shared/lib/type-guards';

import { type AiFetchOptions, aiRequestCancelledFailure, isAbortLikeError } from './abort';
import { headersForAiOperation } from './aiOperation';
import { pollGetLoop } from './pollGetLoop';

function parseTokenUsage(raw: unknown): { prompt: number; completion: number } | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const row = raw as Record<string, unknown>;
  const prompt = isNumber(row.prompt) && row.prompt >= 0 ? Math.floor(row.prompt) : undefined;
  const completion =
    isNumber(row.completion) && row.completion >= 0 ? Math.floor(row.completion) : undefined;
  if (prompt == null || completion == null) {
    return undefined;
  }
  return { prompt, completion };
}

export type AiRecordingMarkOption = {
  offsetMs: number;
  label: string;
};

export type AiProcessingOptions = {
  summaryStyle?: 'brief' | 'standard' | 'detailed';
  taskStrictness?: 'strict' | 'balanced' | 'soft';
  outputLanguage?: 'same' | 'ru' | 'en';
  processingPreset?: 'meeting';
  existingTaskTexts?: string[];
  taskExtractionHint?: string;
  recordingMarks?: AiRecordingMarkOption[];
};

type AiApiRequestBody = {
  id: string;
  transcript: string;
  transcriptSegments?: Array<{ startMs?: number; endMs?: number; text: string }>;
  model: string;
  modelMode?: 'manual' | 'auto';
  routingContext?: {
    taskType?: 'summary_tasks' | 'ask';
    transcriptChars?: number;
  };
  systemPrompt?: string;
  options?: AiProcessingOptions;
  /** Server clamps to 300–3600; omit for API default (1 hour). */
  messageTtlSeconds?: number;
};

type AiApiSuccessResponse = {
  id: string;
  status: 'processing';
  model?: string;
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
  meetingDialogueMarkdown?: string;
  reasoning?: string;
  model?: string;
  tokenUsage?: { prompt: number; completion: number };
};

export type AiMessageResult =
  | { ok: true; result: AiProcessingResult }
  | { ok: false; error: string };

type MessageResponse =
  | { id: string; status: 'processing'; model?: string }
  | {
      id: string;
      status: 'done';
      model?: string;
      summary: string;
      suggestedTitle?: string;
      tasks: AiTask[];
      tags: string[];
      classification?: RecordClassification;
      keyPhrases?: string[];
      nextSteps?: string[];
      meetingDialogueMarkdown?: string;
      reasoning?: string;
      tokenUsage?: { prompt: number; completion: number };
    }
  | { id: string; status: 'error'; error: string; model?: string };

export async function postAiMessage(
  body: AiApiRequestBody,
  options?: AiFetchOptions,
): Promise<AiApiResult> {
  const url = `${getWebApiUrl()}/api/messages`;

  if (options?.signal?.aborted) {
    return aiRequestCancelledFailure();
  }

  let response: Response;
  try {
    response = await fetchWithAuth(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headersForAiOperation('transcript_summarize'),
      },
      body: JSON.stringify(body),
      signal: options?.signal,
    });
  } catch (err) {
    if (options?.signal?.aborted || isAbortLikeError(err)) {
      return aiRequestCancelledFailure();
    }
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
  bonusAmount?: number;
};

function parseAiUsagePayload(raw: Record<string, unknown>): AiUsage {
  const bonusAmountRaw = raw.bonusAmount;
  const bonusAmount =
    isNumber(bonusAmountRaw) && bonusAmountRaw > 0
      ? bonusAmountRaw
      : isString(bonusAmountRaw) && /^\d+$/.test(bonusAmountRaw)
        ? Math.max(1, parseInt(bonusAmountRaw, 10))
        : undefined;

  return {
    used: Number(raw.used) || 0,
    limit: Number(raw.limit) || 0,
    remaining: Number(raw.remaining) || 0,
    resetAt: String(raw.resetAt ?? ''),
    resetAtUtc: String(raw.resetAtUtc ?? ''),
    ...(bonusAmount != null ? { bonusAmount } : {}),
  };
}

export async function getAiUsage(): Promise<AiUsage | null> {
  try {
    const response = await fetchWithAuth(`${getWebApiUrl()}/api/ai-usage`, { method: 'GET' });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;

    return parseAiUsagePayload(data);
  } catch {
    return null;
  }
}

export type ClaimAiBonusResult =
  | { ok: true; usage: AiUsage; cooldownSeconds: number }
  | { ok: false; error: string; cooldown?: boolean; retryAfterSeconds?: number };

export async function claimAiBonus(): Promise<ClaimAiBonusResult> {
  try {
    const response = await fetchWithAuth(`${getWebApiUrl()}/api/ai-usage/bonus`, {
      method: 'POST',
    });

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

    const raw = (await response.json()) as Record<string, unknown>;
    const usage = parseAiUsagePayload(raw);
    const cooldownSeconds =
      isNumber(raw.bonusCooldownSeconds) && raw.bonusCooldownSeconds > 0
        ? raw.bonusCooldownSeconds
        : 900;
    return { ok: true, usage, cooldownSeconds };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return { ok: false, error: message };
  }
}

export async function pollAiMessage(
  id: string,
  syncToken?: string,
  options?: AiFetchOptions,
): Promise<AiMessageResult> {
  const headers: Record<string, string> = {};
  if (syncToken) {
    headers['x-upstash-sync-token'] = syncToken;
  }

  const url = `${getWebApiUrl()}/api/messages/${id}`;

  const result = await pollGetLoop<AiProcessingResult>(
    url,
    (json) => {
      const msg = json as MessageResponse;
      if (msg.status === 'done') {
        const suggested =
          'suggestedTitle' in msg &&
          isString((msg as { suggestedTitle?: string }).suggestedTitle) &&
          (msg as { suggestedTitle: string }).suggestedTitle.trim()
            ? { suggestedTitle: (msg as { suggestedTitle: string }).suggestedTitle.trim() }
            : {};
        const modelField =
          isString(msg.model) && msg.model.trim() ? { model: msg.model.trim() } : {};
        const mdRaw = (msg as { meetingDialogueMarkdown?: unknown }).meetingDialogueMarkdown;
        const meetingMd =
          isString(mdRaw) && mdRaw.trim() ? { meetingDialogueMarkdown: mdRaw.trim() } : {};
        const reasoningRaw = (msg as { reasoning?: unknown }).reasoning;
        const reasoningField =
          isString(reasoningRaw) && reasoningRaw.trim() ? { reasoning: reasoningRaw.trim() } : {};
        const tokenUsage = parseTokenUsage((msg as { tokenUsage?: unknown }).tokenUsage);
        const tokenUsageField = tokenUsage ? { tokenUsage } : {};

        return {
          ok: true,
          result: {
            summary: msg.summary,
            tasks: msg.tasks,
            tags: msg.tags ?? [],
            ...suggested,
            ...modelField,
            ...(msg.classification && { classification: msg.classification }),
            ...(msg.keyPhrases && { keyPhrases: msg.keyPhrases }),
            ...(msg.nextSteps && { nextSteps: msg.nextSteps }),
            ...meetingMd,
            ...reasoningField,
            ...tokenUsageField,
          },
        };
      }

      if (msg.status === 'error') {
        if (__DEV__) console.warn('[AI] pollAiMessage: server error', { id, error: msg.error });
        return { ok: false, error: msg.error };
      }

      return 'processing';
    },
    { ...options, headers },
  );

  if (!result.ok && result.error === 'Timeout waiting for AI result' && __DEV__) {
    console.warn('[AI] pollAiMessage: timeout', { id });
  }

  return result;
}
