/**
 * Request deduplication to prevent duplicate processing of identical requests.
 * Uses in-memory cache with TTL to track pending requests.
 */

type PendingRequest<T> = {
  promise: Promise<T>;
  timestamp: number;
};

class RequestDeduplicator {
  private pending = new Map<string, PendingRequest<unknown>>();
  private readonly defaultTtlMs: number;
  private readonly cleanupIntervalMs: number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(defaultTtlMs = 5000, cleanupIntervalMs = 10000) {
    this.defaultTtlMs = defaultTtlMs;
    this.cleanupIntervalMs = cleanupIntervalMs;
    this.startCleanup();
  }

  /**
   * Execute a function with deduplication. If the same key is already being processed,
   * returns the existing promise instead of starting a new execution.
   */
  async execute<T>(key: string, fn: () => Promise<T>, ttlMs?: number): Promise<T> {
    const effectiveTtl = ttlMs ?? this.defaultTtlMs;

    const existing = this.pending.get(key) as PendingRequest<T> | undefined;
    if (existing) {
      const age = Date.now() - existing.timestamp;
      if (age < effectiveTtl) {
        return existing.promise;
      }
      this.pending.delete(key);
    }

    const promise = fn()
      .then((result) => {
        this.pending.delete(key);
        return result;
      })
      .catch((error) => {
        this.pending.delete(key);
        throw error;
      });

    this.pending.set(key, {
      promise: promise as Promise<unknown>,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * Check if a key is currently being processed.
   */
  isPending(key: string): boolean {
    return this.pending.has(key);
  }

  /**
   * Get the number of pending requests.
   */
  getPendingCount(): number {
    return this.pending.size;
  }

  /**
   * Clear a specific key from pending requests.
   */
  clear(key: string): void {
    this.pending.delete(key);
  }

  /**
   * Clear all pending requests.
   */
  clearAll(): void {
    this.pending.clear();
  }

  /**
   * Start periodic cleanup of expired pending requests.
   */
  private startCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      const expiredKeys: string[] = [];

      for (const [key, request] of this.pending.entries()) {
        if (now - request.timestamp > this.defaultTtlMs * 2) {
          expiredKeys.push(key);
        }
      }

      for (const key of expiredKeys) {
        this.pending.delete(key);
      }
    }, this.cleanupIntervalMs);

    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stop cleanup timer.
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }
}

export const requestDeduplicator = new RequestDeduplicator(5000, 10000);

/**
 * Helper function to deduplicate requests by key.
 */
export async function withDeduplication<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs = 5000,
): Promise<T> {
  return requestDeduplicator.execute(key, fn, ttlMs);
}

/**
 * Generate a deduplication key for message/ask creation.
 */
export function getMessageDeduplicationKey(deviceId: string, messageId: string): string {
  return `msg:${deviceId}:${messageId}`;
}

export function getAskDeduplicationKey(deviceId: string, askId: string): string {
  return `ask:${deviceId}:${askId}`;
}
