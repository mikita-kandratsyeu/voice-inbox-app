import { getWebApiUrl } from '@/shared/config/runtimeConfig';
import { fetchWithAuth } from '@/shared/lib/api-auth';
import { isNumber, isString } from '@/shared/lib/type-guards';

import { type AiFetchOptions, aiRequestCancelledFailure, isAbortLikeError } from './abort';
import { headersForAiOperation } from './aiOperation';
import { aiPollTimeoutMs, aiResumePollTimeoutMs } from './constants';
import {
  type ParsedMessagePollState,
  parseMessagePollState,
  type ServerMeetingDialogueStatus,
} from './parseMessageResponse';
import { pollGetLoop } from './pollGetLoop';
import { readResponseJson } from './responseJson';

export type { ServerMeetingDialogueStatus };

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

export type PollAiMessageOptions = AiFetchOptions & {
  /** Second QStash pass for long meetings; extends poll deadline. */
  expectAsyncMeetingDialogue?: boolean;
  /** Fired when summary/tasks are ready but speaker breakdown is still processing. */
  onSummaryReady?: (result: AiProcessingResult) => void | Promise<void>;
};

export type AiMessageResult =
  | {
      ok: true;
      result: AiProcessingResult;
      meetingDialogueStatus?: ServerMeetingDialogueStatus;
    }
  | { ok: false; error: string };

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
    const limitBody = await readResponseJson(response);
    if (!limitBody.ok) {
      return { ok: false, error: limitBody.error };
    }
    const json = limitBody.data as AiApiLimitResponse;
    if (__DEV__) console.warn('[AI] postAiMessage: limit exceeded', json.usage);
    return { ok: false, limitExceeded: true, usage: json.usage };
  }

  if (!response.ok) {
    const text = await response.text();
    if (__DEV__)
      console.warn('[AI] postAiMessage: HTTP error', { status: response.status, body: text });
    return { ok: false, error: text || `HTTP ${response.status}` };
  }

  const successBody = await readResponseJson(response);
  if (!successBody.ok) {
    return { ok: false, error: successBody.error };
  }

  const data = successBody.data as AiApiSuccessResponse;

  return { ok: true, data };
}

export type MeetingDialogueRetryRequestBody = {
  transcript: string;
  transcriptSegments?: Array<{ startMs?: number; endMs?: number; text: string }>;
  model: string;
  options: AiProcessingOptions;
  messageTtlSeconds?: number;
  /** Summarize snapshot for server rehydration when Redis KV expired. */
  phase1?: {
    suggestedTitle: string;
    summary: string;
    keyPhrases?: string[];
  };
};

export async function postMeetingDialogueRetry(
  jobId: string,
  body: MeetingDialogueRetryRequestBody,
  options?: AiFetchOptions,
): Promise<AiApiResult> {
  const url = `${getWebApiUrl()}/api/messages/${encodeURIComponent(jobId)}/meeting-dialogue`;

  if (options?.signal?.aborted) {
    return aiRequestCancelledFailure();
  }

  let response: Response;
  try {
    response = await fetchWithAuth(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headersForAiOperation('meeting_dialogue_retry'),
      },
      body: JSON.stringify(body),
      signal: options?.signal,
    });
  } catch (err) {
    if (options?.signal?.aborted || isAbortLikeError(err)) {
      return aiRequestCancelledFailure();
    }
    const errorMsg = err instanceof Error ? err.message : 'Network error';
    if (__DEV__) console.warn('[AI] postMeetingDialogueRetry: fetch failed', { error: errorMsg });
    return { ok: false, error: errorMsg };
  }

  if (response.status === 429) {
    const limitBody = await readResponseJson(response);
    if (!limitBody.ok) {
      return { ok: false, error: limitBody.error };
    }
    const json = limitBody.data as AiApiLimitResponse;
    return { ok: false, limitExceeded: true, usage: json.usage };
  }

  if (!response.ok) {
    const text = await response.text();
    return { ok: false, error: text || `HTTP ${response.status}` };
  }

  const successBody = await readResponseJson(response);
  if (!successBody.ok) {
    return { ok: false, error: successBody.error };
  }

  return { ok: true, data: successBody.data as AiApiSuccessResponse };
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

function aiMessagePollHeaders(syncToken?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (syncToken) {
    headers['x-upstash-sync-token'] = syncToken;
  }
  return headers;
}

/** Single GET for resume path — avoids poll loop when the job is already done on the server. */
export async function fetchAiMessageOnce(
  id: string,
  syncToken?: string,
): Promise<
  | { ok: true; state: ParsedMessagePollState }
  | { ok: false; notFound: true }
  | { ok: false; error: string }
> {
  const url = `${getWebApiUrl()}/api/messages/${encodeURIComponent(id)}`;
  try {
    const response = await fetchWithAuth(url, { headers: aiMessagePollHeaders(syncToken) });
    if (response.status === 404) {
      return { ok: false, notFound: true };
    }
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }
    const body = await readResponseJson(response);
    if (!body.ok) {
      return { ok: false, error: body.error };
    }
    return { ok: true, state: parseMessagePollState(body.data) };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return { ok: false, error: message };
  }
}

export type ResumePollAiMessageOptions = Omit<PollAiMessageOptions, 'signal'> & {
  expiresAtMs: number;
};

/** Poll with a shorter deadline for jobs resumed after app restart. */
export async function resumePollAiMessage(
  id: string,
  syncToken: string | undefined,
  options: ResumePollAiMessageOptions,
): Promise<AiMessageResult> {
  const once = await fetchAiMessageOnce(id, syncToken);
  if (once.ok) {
    if (once.state.kind === 'done') {
      if (once.state.meetingDialogueStatus === 'processing') {
        // fall through to limited poll for speakers
      } else {
        return {
          ok: true,
          result: once.state.result,
          meetingDialogueStatus: once.state.meetingDialogueStatus,
        };
      }
    } else if (once.state.kind === 'error') {
      return { ok: false, error: once.state.error };
    }
  } else if ('notFound' in once && once.notFound) {
    return { ok: false, error: 'AI result expired' };
  }

  return pollAiMessage(id, syncToken, {
    ...options,
    expectAsyncMeetingDialogue: options.expectAsyncMeetingDialogue,
    timeoutMs: aiResumePollTimeoutMs(
      options.expectAsyncMeetingDialogue === true,
      options.expiresAtMs,
    ),
  });
}

export async function pollAiMessage(
  id: string,
  syncToken?: string,
  options?: PollAiMessageOptions & { timeoutMs?: number },
): Promise<AiMessageResult> {
  const headers = aiMessagePollHeaders(syncToken);

  const url = `${getWebApiUrl()}/api/messages/${id}`;
  const expectAsyncMeetingDialogue = options?.expectAsyncMeetingDialogue === true;
  let summaryReadyDelivered = false;

  const result = await pollGetLoop<{
    result: AiProcessingResult;
    meetingDialogueStatus?: ServerMeetingDialogueStatus;
  }>(
    url,
    (json) => {
      const state = parseMessagePollState(json);
      if (state.kind === 'processing') {
        return 'processing';
      }
      if (state.kind === 'error') {
        if (__DEV__) console.warn('[AI] pollAiMessage: server error', { id, error: state.error });
        return { ok: false, error: state.error };
      }

      if (state.meetingDialogueStatus === 'processing') {
        if (!summaryReadyDelivered && options?.onSummaryReady) {
          summaryReadyDelivered = true;
          return Promise.resolve(options.onSummaryReady(state.result)).then(
            () => 'processing' as const,
          );
        }
        return 'processing';
      }

      return {
        ok: true,
        result: {
          result: state.result,
          meetingDialogueStatus: state.meetingDialogueStatus,
        },
      };
    },
    {
      signal: options?.signal,
      headers,
      timeoutMs: options?.timeoutMs ?? aiPollTimeoutMs(expectAsyncMeetingDialogue),
    },
  );

  if (!result.ok && result.error === 'Timeout waiting for AI result' && __DEV__) {
    console.warn('[AI] pollAiMessage: timeout', { id, expectAsyncMeetingDialogue });
  }

  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    result: result.result.result,
    meetingDialogueStatus: result.result.meetingDialogueStatus,
  };
}
