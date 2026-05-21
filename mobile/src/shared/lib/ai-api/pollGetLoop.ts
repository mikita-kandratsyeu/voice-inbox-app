import { fetchWithAuth } from '@/shared/lib/api-auth';

import {
  type AiFetchOptions,
  aiRequestCancelledFailure,
  interruptibleDelay,
  isAbortLikeError,
} from './abort';
import { AI_POLL_TIMEOUT_MS } from './constants';
import { readResponseJson } from './responseJson';
const POLL_BACKOFF_INITIAL_MS = 2_000;
const POLL_BACKOFF_CAP_MS = 8_000;

export type PollGetLoopResult<T> = { ok: true; result: T } | { ok: false; error: string };

/**
 * Polls a GET endpoint until `parseResponse` returns done/error, or timeout.
 * Aborts in-flight fetch and stops when `options.signal` is aborted.
 */
export async function pollGetLoop<T>(
  url: string,
  parseResponse: (json: unknown) => PollGetLoopResult<T> | 'processing',
  options?: AiFetchOptions & { headers?: Record<string, string> },
): Promise<PollGetLoopResult<T>> {
  const headers = options?.headers ?? {};
  const signal = options?.signal;
  const deadline = Date.now() + AI_POLL_TIMEOUT_MS;
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
      response = await fetchWithAuth(url, { headers, signal });
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
      if (__DEV__) {
        console.warn('[AI] poll: non-JSON body', body.error);
      }
      continue;
    }

    const parsed = parseResponse(body.data);
    if (parsed === 'processing') {
      continue;
    }
    return parsed;
  }

  return { ok: false, error: 'Timeout waiting for AI result' };
}
