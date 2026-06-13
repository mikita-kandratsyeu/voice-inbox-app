import { fetchWithAuth } from '@/shared/lib/api-auth';
import { WEB_API_POLL_FETCH_TIMEOUT_MS } from '@/shared/lib/api-auth/constants';

import {
  type AiFetchOptions,
  aiRequestCancelledFailure,
  interruptibleDelay,
  isAbortLikeError,
} from './abort';
import { AI_POLL_TIMEOUT_MS } from './constants';

export type PollGetParseOutcome<T> =
  | PollGetLoopResult<T>
  | 'processing'
  | Promise<PollGetLoopResult<T> | 'processing'>;
import { devWarn } from '@/shared/lib/appLogger';

import { readResponseJson } from './responseJson';
const POLL_BACKOFF_INITIAL_MS = 2_000;
const POLL_BACKOFF_CAP_MS = 8_000;

export type PollGetLoopResult<T> = { ok: true; result: T } | { ok: false; error: string };

export const AI_POLL_TIMEOUT_ERROR = 'Timeout waiting for AI result';

/**
 * Polls a GET endpoint until `parseResponse` returns done/error, or timeout.
 * Aborts in-flight fetch and stops when `options.signal` is aborted.
 */
export async function pollGetLoop<T>(
  url: string,
  parseResponse: (json: unknown) => PollGetParseOutcome<T>,
  options?: AiFetchOptions & {
    headers?: Record<string, string>;
    /** Overrides default AI poll budget (e.g. resume after app restart). */
    timeoutMs?: number;
  },
): Promise<PollGetLoopResult<T>> {
  const headers = options?.headers ?? {};
  const signal = options?.signal;
  const deadline = Date.now() + (options?.timeoutMs ?? AI_POLL_TIMEOUT_MS);
  let intervalMs = POLL_BACKOFF_INITIAL_MS;

  while (Date.now() < deadline) {
    if (signal?.aborted) {
      return aiRequestCancelledFailure();
    }

    try {
      await interruptibleDelay(intervalMs, signal);
    } catch (err) {
      if (signal?.aborted || isAbortLikeError(err)) {
        return aiRequestCancelledFailure();
      }
      throw err;
    }

    intervalMs = Math.min(intervalMs * 2, POLL_BACKOFF_CAP_MS);

    if (signal?.aborted) {
      return aiRequestCancelledFailure();
    }

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
      continue;
    }

    if (!response.ok) {
      continue;
    }

    const body = await readResponseJson(response);
    if (!body.ok) {
      devWarn('[AI] poll: non-JSON body', body.error);
      continue;
    }

    const parsed = await Promise.resolve(parseResponse(body.data));
    if (parsed === 'processing') {
      continue;
    }
    return parsed;
  }

  return { ok: false, error: AI_POLL_TIMEOUT_ERROR };
}
