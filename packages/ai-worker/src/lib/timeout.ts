/**
 * Timeout utilities for wrapping async operations with time limits.
 */

import { getAiJobProcessingTimeoutMs } from '@/lib/ai-job-duration';

export class TimeoutError extends Error {
  constructor(
    message: string,
    public readonly timeoutMs: number,
  ) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Wraps a promise with a timeout. Rejects if the operation doesn't complete in time.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out',
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(`${errorMessage} (${timeoutMs}ms)`, timeoutMs));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * Wraps multiple operations with individual timeouts.
 * Returns partial results if some operations timeout.
 */
export async function withTimeoutPartial<T>(
  operations: Array<{ promise: Promise<T>; timeoutMs: number; fallback?: T }>,
): Promise<T[]> {
  const results = await Promise.allSettled(
    operations.map(({ promise, timeoutMs, fallback }) =>
      withTimeout(promise, timeoutMs).catch((error) => {
        if (error instanceof TimeoutError && fallback !== undefined) {
          return fallback;
        }
        throw error;
      }),
    ),
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    if (operations[index].fallback !== undefined) {
      return operations[index].fallback!;
    }
    throw result.reason;
  });
}

function aiProcessingTimeoutMs(): number {
  return getAiJobProcessingTimeoutMs();
}

/**
 * Timeout configurations for different operation types.
 *
 * AI timeouts are 10s below worker `maxDuration` (Vercel 300s or Cloud Run 900s).
 */
export const TIMEOUTS = {
  get AI_PROCESSING() {
    return aiProcessingTimeoutMs();
  },
  get AI_CHAT() {
    return aiProcessingTimeoutMs();
  },
  DATABASE_QUERY: 30_000, // 30 seconds
  DATABASE_TRANSACTION: 60_000, // 1 minute
  REDIS_OPERATION: 5_000, // 5 seconds
  EXTERNAL_API: 30_000, // 30 seconds
  WEBHOOK: 15_000, // 15 seconds
} as const;
