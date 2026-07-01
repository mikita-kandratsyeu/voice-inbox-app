import { calculatePollDeadlineMs } from '@/lib/ai-job-duration';
import type { PollingHints } from '@/types';
import { TYPICAL_COMPLETION_MS, BASE_POLL_INTERVALS, type JobType } from './job-types';

// Re-export JobType for convenience
export type { JobType } from './job-types';

/**
 * Calculates adaptive polling hints for a job in progress.
 *
 * @param jobType - Type of job being processed
 * @param elapsedMs - Milliseconds elapsed since job started
 * @param estimatedTotalMs - Optional override for typical completion time
 * @returns Polling hints for mobile client optimization
 *
 * @example
 * const hints = calculatePollingHints('summary', 15000);
 * // { progress: 50, retryAfterMs: 2500, estimatedCompletionMs: 15000 }
 */
export function calculatePollingHints(
  jobType: JobType,
  elapsedMs: number,
  estimatedTotalMs?: number,
  startedAtMs?: number,
): PollingHints {
  const totalMs = estimatedTotalMs ?? TYPICAL_COMPLETION_MS[jobType];
  const progress = Math.min(95, Math.round((elapsedMs / totalMs) * 100));
  const jobStartedAtMs = startedAtMs ?? Date.now() - elapsedMs;

  // Progress-aware polling intervals (matches mobile strategy)
  let retryAfterMs: number;
  if (progress >= 90) {
    retryAfterMs = 800; // Very close - aggressive polling
  } else if (progress >= 75) {
    retryAfterMs = 1_500; // Close - moderate polling
  } else if (progress >= 50) {
    retryAfterMs = 2_500; // Half done - relaxed polling
  } else {
    // Early stage - use job-type base interval
    retryAfterMs = BASE_POLL_INTERVALS[jobType];
  }

  const estimatedCompletionMs = Math.max(0, totalMs - elapsedMs);

  return {
    progress,
    retryAfterMs,
    estimatedCompletionMs,
    pollDeadlineMs: calculatePollDeadlineMs(jobStartedAtMs, jobType),
  };
}

/**
 * Enriches a processing message with adaptive polling hints.
 *
 * @param message - Processing message to enrich
 * @param jobType - Type of job
 * @param startedAtMs - Job start timestamp (Unix milliseconds)
 * @returns Message with polling hints added
 *
 * @example
 * const enriched = enrichWithPollingHints(
 *   { id: 'msg_123', status: 'processing' },
 *   'summary',
 *   Date.now() - 15000
 * );
 * // { id: 'msg_123', status: 'processing', progress: 50, retryAfterMs: 2500, ... }
 */
export function enrichWithPollingHints<T extends { status: 'processing' }>(
  message: T,
  jobType: JobType,
  startedAtMs: number,
): T & PollingHints {
  const elapsedMs = Date.now() - startedAtMs;
  const hints = calculatePollingHints(jobType, elapsedMs, undefined, startedAtMs);

  return {
    ...message,
    ...hints,
  };
}

// Re-export inferJobType for convenience
export { inferJobType, operationToJobType } from './job-types';
