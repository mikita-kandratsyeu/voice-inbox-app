import { fetchWithAuth } from '@/shared/lib/api-auth';
import { WEB_API_POLL_FETCH_TIMEOUT_MS } from '@/shared/lib/api-auth/constants';

import {
  type AiFetchOptions,
  aiRequestCancelledFailure,
  interruptibleDelay,
  isAbortLikeError,
} from './abort';
import { AI_POLL_TIMEOUT_MS, resolvePollDeadlineMs } from './constants';

export type PollGetParseOutcome<T> =
  | PollGetLoopResult<T>
  | 'processing'
  | Promise<PollGetLoopResult<T> | 'processing'>;
import { devLog, devWarn } from '@/shared/lib/appLogger';

import type { PollJobType, ServerPollHint } from './adaptivePolling';
import { AdaptivePollingStrategy } from './adaptivePolling';
import { dedupedPoll } from './pollDeduplication';
import { readResponseJson } from './responseJson';

const POLL_INITIAL_MS = 500; // First poll after 500ms (was 2000ms)
const POLL_MAX_MS = 15_000; // Safety cap

export type PollGetLoopResult<T> = { ok: true; result: T } | { ok: false; error: string };

export const AI_POLL_TIMEOUT_ERROR = 'Timeout waiting for AI result';

/**
 * Helper to extract server hints from response data for adaptive polling.
 */
function extractServerHints(data: unknown): ServerPollHint | undefined {
  if (!data || typeof data !== 'object') return undefined;

  const obj = data as Record<string, unknown>;

  const retryAfterMs =
    typeof obj.retryAfterMs === 'number' && obj.retryAfterMs > 0 ? obj.retryAfterMs : undefined;
  const estimatedCompletionMs =
    typeof obj.estimatedCompletionMs === 'number' && obj.estimatedCompletionMs > 0
      ? obj.estimatedCompletionMs
      : undefined;
  const progress =
    typeof obj.progress === 'number' && obj.progress >= 0 && obj.progress <= 100
      ? obj.progress
      : undefined;

  const pollDeadlineMs =
    typeof obj.pollDeadlineMs === 'number' && obj.pollDeadlineMs > 0 ? obj.pollDeadlineMs : undefined;

  if (!retryAfterMs && !estimatedCompletionMs && !progress && !pollDeadlineMs) {
    return undefined;
  }

  return { retryAfterMs, estimatedCompletionMs, progress, pollDeadlineMs };
}

/**
 * Polls a GET endpoint until `parseResponse` returns done/error, or timeout.
 * Aborts in-flight fetch and stops when `options.signal` is aborted.
 *
 * Features:
 * - Adaptive polling intervals based on job type and server hints
 * - Automatic deduplication of concurrent polls for same URL
 * - Progress-aware acceleration near completion
 * - Smooth exponential backoff on errors
 */
export async function pollGetLoop<T>(
  url: string,
  parseResponse: (json: unknown) => PollGetParseOutcome<T>,
  options?: AiFetchOptions & {
    headers?: Record<string, string>;
    /** Overrides default AI poll budget (e.g. resume after app restart). */
    timeoutMs?: number;
    /** When server omits pollDeadlineMs, extend budget for async meeting dialogue. */
    expectAsyncMeetingDialogue?: boolean;
    /** Job type for adaptive polling strategy */
    jobType?: PollJobType;
    /** Optional callback for progress updates */
    onProgress?: (progress: number) => void;
    /** Enable deduplication (default: true) */
    enableDedup?: boolean;
  },
): Promise<PollGetLoopResult<T>> {
  const enableDedup = options?.enableDedup ?? true;
  const jobId = url; // Use URL as dedup key

  // Wrap in deduplication layer if enabled
  if (enableDedup) {
    return dedupedPoll(jobId, () => pollGetLoopImpl(url, parseResponse, options));
  }

  return pollGetLoopImpl(url, parseResponse, options);
}

/**
 * Internal implementation of poll loop with adaptive strategy.
 */
async function pollGetLoopImpl<T>(
  url: string,
  parseResponse: (json: unknown) => PollGetParseOutcome<T>,
  options?: AiFetchOptions & {
    headers?: Record<string, string>;
    timeoutMs?: number;
    expectAsyncMeetingDialogue?: boolean;
    jobType?: PollJobType;
    onProgress?: (progress: number) => void;
  },
): Promise<PollGetLoopResult<T>> {
  const headers = options?.headers ?? {};
  const signal = options?.signal;
  let deadline =
    options?.timeoutMs != null
      ? Date.now() + options.timeoutMs
      : resolvePollDeadlineMs(undefined, options?.expectAsyncMeetingDialogue === true);
  const startTime = Date.now();
  const strategy = new AdaptivePollingStrategy();

  let attempt = 0;
  let currentInterval = POLL_INITIAL_MS;
  let skipDelay = true; // First poll immediately

  devLog(
    `[Poll] Starting poll loop for ${options?.jobType ?? 'unknown'} job, timeout=${options?.timeoutMs ?? AI_POLL_TIMEOUT_MS}ms`,
  );

  while (Date.now() < deadline) {
    if (signal?.aborted) {
      return aiRequestCancelledFailure();
    }

    // Delay before next poll (skip first iteration)
    if (!skipDelay) {
      try {
        devLog(`[Poll] Waiting ${currentInterval}ms before next poll (attempt ${attempt})`);
        await interruptibleDelay(currentInterval, signal);
      } catch (err) {
        if (signal?.aborted || isAbortLikeError(err)) {
          return aiRequestCancelledFailure();
        }
        throw err;
      }
    }
    skipDelay = false;

    if (signal?.aborted) {
      return aiRequestCancelledFailure();
    }

    // Fetch with retry on network errors
    let response: Response;
    try {
      response = await fetchWithAuth(url, {
        headers,
        signal,
        timeoutMs: WEB_API_POLL_FETCH_TIMEOUT_MS,
      });
    } catch (err) {
      if (signal?.aborted || isAbortLikeError(err)) {
        return aiRequestCancelledFailure();
      }

      // Network error - use slower backoff
      devWarn('[Poll] Network error:', err);
      currentInterval = Math.min(currentInterval * 1.5, POLL_MAX_MS);
      attempt++;
      continue;
    }

    if (!response.ok) {
      // HTTP error - slower backoff
      devWarn(`[Poll] HTTP error: ${response.status}`);
      currentInterval = Math.min(currentInterval * 1.3, POLL_MAX_MS);
      attempt++;
      continue;
    }

    const body = await readResponseJson(response);
    if (!body.ok) {
      devWarn('[AI] poll: non-JSON body', body.error);
      currentInterval = Math.min(currentInterval * 1.3, POLL_MAX_MS);
      attempt++;
      continue;
    }

    const parsed = await Promise.resolve(parseResponse(body.data));

    if (parsed === 'processing') {
      // Extract server hints for adaptive interval
      const hints = extractServerHints(body.data);

      if (hints?.pollDeadlineMs && hints.pollDeadlineMs > Date.now()) {
        deadline = Math.max(deadline, hints.pollDeadlineMs);
      }

      // Report progress if available
      if (hints?.progress !== undefined && options?.onProgress) {
        options.onProgress(hints.progress);
      }

      // Calculate next interval adaptively
      currentInterval = strategy.getNextInterval(attempt, hints, options?.jobType);

      devLog(`[Poll] Still processing, next interval=${currentInterval}ms`, hints);

      attempt++;
      continue;
    }

    // Done or error
    const duration = Date.now() - startTime;
    strategy.recordPollDuration(duration);

    const stats = strategy.getStats();
    devLog(
      `[Poll] Completed in ${duration}ms (attempts=${attempt}, avgDuration=${stats.avgDurationMs}ms)`,
    );

    return parsed;
  }

  devWarn('[Poll] Timeout after', Date.now() - startTime, 'ms');
  return { ok: false, error: AI_POLL_TIMEOUT_ERROR };
}
