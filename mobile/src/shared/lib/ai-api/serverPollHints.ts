import { isNonEmptyString, isPositiveNumber, isProgressPercent, isRecord } from '../type-guards';
import type { ServerPollHint } from './adaptivePolling';

/** Parses adaptive polling hints from a JSON object body. */
export function parseServerPollHints(data: unknown): ServerPollHint | undefined {
  if (!isRecord(data)) return undefined;

  const retryAfterMs = isPositiveNumber(data.retryAfterMs) ? data.retryAfterMs : undefined;
  const estimatedCompletionMs = isPositiveNumber(data.estimatedCompletionMs)
    ? data.estimatedCompletionMs
    : undefined;
  const progress = isProgressPercent(data.progress) ? data.progress : undefined;
  const pollExpiresAt = isNonEmptyString(data.pollExpiresAt)
    ? data.pollExpiresAt.trim()
    : undefined;

  if (
    retryAfterMs == null &&
    estimatedCompletionMs == null &&
    progress == null &&
    pollExpiresAt == null
  ) {
    return undefined;
  }

  return { retryAfterMs, estimatedCompletionMs, progress, pollExpiresAt };
}
