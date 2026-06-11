/**
 * Timeout utilities for wrapping async operations with time limits.
 */

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

/**
 * Timeout configurations for different operation types.
 *
 * Note: Vercel Fluid Functions maxDuration is 300s (5 minutes).
 * AI timeouts set to 290s to allow graceful error handling before Vercel kills the function.
 */
export const TIMEOUTS = {
  AI_PROCESSING: 290_000, // 290 seconds (4m 50s) - for summary, meeting dialogue
  AI_CHAT: 290_000, // 290 seconds (4m 50s) - for ask queries
  DATABASE_QUERY: 30_000, // 30 seconds
  DATABASE_TRANSACTION: 60_000, // 1 minute
  REDIS_OPERATION: 5_000, // 5 seconds
  EXTERNAL_API: 30_000, // 30 seconds
  WEBHOOK: 15_000, // 15 seconds
} as const;
