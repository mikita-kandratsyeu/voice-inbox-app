import { devLog } from '@/shared/lib/appLogger';

/**
 * Active poll request tracking for deduplication.
 */
type PollRequest<T> = {
  promise: Promise<T>;
  subscribers: Array<(result: PollResult<T>) => void>;
  startedAt: number;
  jobId: string;
};

type PollResult<T> = { ok: true; data: T } | { ok: false; error: string };

const activePolls = new Map<string, PollRequest<unknown>>();

/**
 * Deduplicates concurrent polls for the same job ID.
 * When multiple components/screens poll the same job simultaneously,
 * only one HTTP poll loop runs and all subscribers receive the result.
 *
 * Benefits:
 * - Reduces redundant HTTP requests by N-1 for N concurrent polls
 * - Shared network cost across multiple UI components
 * - Lower server load
 *
 * @param jobId - Unique job identifier (message ID, ask ID, etc.)
 * @param pollFn - Function that executes the poll loop
 * @returns Promise that resolves when job completes
 *
 * @example
 * // Two components polling same job simultaneously
 * const result1 = dedupedPoll('msg_123', () => pollAiMessage('msg_123'));
 * const result2 = dedupedPoll('msg_123', () => pollAiMessage('msg_123'));
 * // Only ONE HTTP poll loop runs, both promises resolve with same result
 */
export async function dedupedPoll<T>(jobId: string, pollFn: () => Promise<T>): Promise<T> {
  const existing = activePolls.get(jobId) as PollRequest<T> | undefined;

  if (existing) {
    devLog(`[PollDedup] Joining existing poll for job ${jobId}`);

    // Join existing poll by subscribing to its result
    return new Promise<T>((resolve, reject) => {
      existing.subscribers.push((result: PollResult<T>) => {
        if (result.ok) {
          resolve(result.data);
        } else {
          reject(new Error(result.error));
        }
      });
    });
  }

  // Start new poll
  devLog(`[PollDedup] Starting new poll for job ${jobId}`);

  const subscribers: Array<(result: PollResult<T>) => void> = [];

  const promise = pollFn().then(
    (data) => {
      devLog(
        `[PollDedup] Poll completed for job ${jobId}, notifying ${subscribers.length} subscribers`,
      );

      // Notify all subscribers
      const result: PollResult<T> = { ok: true, data };
      subscribers.forEach((sub) => sub(result));

      // Cleanup
      activePolls.delete(jobId);

      return data;
    },
    (error) => {
      devLog(`[PollDedup] Poll failed for job ${jobId}:`, error.message);

      // Notify all subscribers of error
      const result: PollResult<T> = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
      subscribers.forEach((sub) => sub(result));

      // Cleanup
      activePolls.delete(jobId);

      throw error;
    },
  );

  activePolls.set(jobId, {
    promise,
    subscribers,
    startedAt: Date.now(),
    jobId,
  } as PollRequest<unknown>);

  return promise;
}

/**
 * Returns active poll statistics for monitoring.
 */
export function getActivePollStats(): {
  activeCount: number;
  jobs: Array<{ jobId: string; durationMs: number; subscriberCount: number }>;
} {
  const now = Date.now();
  const jobs: Array<{ jobId: string; durationMs: number; subscriberCount: number }> = [];

  for (const [jobId, poll] of activePolls.entries()) {
    jobs.push({
      jobId,
      durationMs: now - poll.startedAt,
      subscriberCount: poll.subscribers.length,
    });
  }

  return {
    activeCount: activePolls.size,
    jobs,
  };
}

/**
 * Cancels all active polls.
 * Used during app cleanup or navigation away from polling screens.
 */
export function cancelAllActivePolls(): void {
  devLog(`[PollDedup] Cancelling ${activePolls.size} active polls`);
  activePolls.clear();
}
