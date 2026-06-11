import { Redis } from '@upstash/redis';

/**
 * Redis connection pool for better resource management.
 * Creates a fixed pool of Redis clients that are reused across requests.
 */
class RedisConnectionPool {
  private clients: Redis[] = [];
  private readonly poolSize: number;
  private currentIndex = 0;
  private initialized = false;

  constructor(poolSize = 10) {
    this.poolSize = poolSize;
  }

  private ensureInitialized(): void {
    if (this.initialized) return;

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error('Redis credentials not configured');
    }

    for (let i = 0; i < this.poolSize; i++) {
      this.clients.push(
        new Redis({
          url,
          token,
          keepAlive: true,
          retry: {
            retries: 3,
            backoff: (retryCount) => Math.min(1000 * Math.pow(2, retryCount), 3000),
          },
        }),
      );
    }

    this.initialized = true;
  }

  /**
   * Get a Redis client from the pool using round-robin strategy.
   */
  getClient(): Redis {
    this.ensureInitialized();
    const client = this.clients[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.poolSize;
    return client;
  }

  /**
   * Create a new Redis client with sync token for read-your-writes consistency.
   */
  getClientWithSyncToken(syncToken: string): Redis {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error('Redis credentials not configured');
    }

    const client = new Redis({
      url,
      token,
      keepAlive: false,
      retry: {
        retries: 2,
        backoff: (retryCount) => Math.min(500 * Math.pow(2, retryCount), 2000),
      },
    });

    client.readYourWritesSyncToken = syncToken;
    return client;
  }

  /**
   * Get current pool size.
   */
  getPoolSize(): number {
    return this.poolSize;
  }

  /**
   * Check if pool is initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

export const redisPool = new RedisConnectionPool(10);

/**
 * Helper to execute Redis commands with exponential backoff retry.
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 100,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (!isRetryableError(error)) {
        throw error;
      }

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 100;
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('econnreset') ||
    message.includes('econnrefused') ||
    message.includes('network') ||
    message.includes('socket')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
