import { isString } from '../type-guards';
import { AI_POLL_TIMEOUT_MS, AI_RESUME_POLL_MAX_MS, aiResumePollTimeoutMs } from './constants';

export type AsyncJobAcceptedResponse = {
  pollExpiresAt?: string;
  syncToken?: string;
};

/** Parses server `pollExpiresAt` (ISO-8601) into absolute epoch ms. */
export function parsePollExpiresAtMs(value: unknown): number | null {
  if (!isString(value) || !value.trim()) return null;
  const ms = Date.parse(value.trim());
  return Number.isFinite(ms) ? ms : null;
}

/** Absolute poll deadline from server field or relative fallback budget. */
export function resolvePollDeadlineMs(params: {
  pollExpiresAt?: unknown;
  fallbackTimeoutMs?: number;
  nowMs?: number;
}): number {
  const now = params.nowMs ?? Date.now();
  const parsed = parsePollExpiresAtMs(params.pollExpiresAt);
  if (parsed != null && parsed > now) {
    return parsed;
  }
  const fallback = params.fallbackTimeoutMs ?? AI_POLL_TIMEOUT_MS;
  return now + fallback;
}

export function remainingPollMs(deadlineMs: number, nowMs = Date.now()): number {
  return Math.max(0, deadlineMs - nowMs);
}

export function pollLoopOptionsFromAcceptedJob(
  accepted: AsyncJobAcceptedResponse,
  fallbackTimeoutMs: number,
): { deadlineMs: number } {
  return {
    deadlineMs: resolvePollDeadlineMs({
      pollExpiresAt: accepted.pollExpiresAt,
      fallbackTimeoutMs,
    }),
  };
}

/** Extends an existing deadline when the server sends a later `pollExpiresAt`. */
export function extendPollDeadlineMs(currentDeadlineMs: number, pollExpiresAt: unknown): number {
  const parsed = parsePollExpiresAtMs(pollExpiresAt);
  if (parsed == null) return currentDeadlineMs;
  return Math.max(currentDeadlineMs, parsed);
}

/** Shorter resume budget capped by KV TTL and stored server poll deadline. */
export function resolveResumePollDeadlineMs(params: {
  pollExpiresAtMs?: number | null;
  kvExpiresAtMs: number;
  expectAsyncMeetingDialogue: boolean;
  nowMs?: number;
}): number {
  const now = params.nowMs ?? Date.now();
  const kvRemaining = Math.max(0, params.kvExpiresAtMs - now);

  if (params.pollExpiresAtMs != null && params.pollExpiresAtMs > now) {
    const pollRemaining = params.pollExpiresAtMs - now;
    const budget = Math.min(AI_RESUME_POLL_MAX_MS, pollRemaining, kvRemaining);
    return now + (budget > 0 ? budget : AI_RESUME_POLL_MAX_MS);
  }

  return now + aiResumePollTimeoutMs(params.expectAsyncMeetingDialogue, params.kvExpiresAtMs);
}
