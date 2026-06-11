import { Redis } from '@upstash/redis';

/**
 * Serverless-optimized Redis client factory.
 *
 * NOTE: In serverless environments (like Vercel), connection pooling is ANTI-PATTERN.
 * Each serverless instance is ephemeral and handles only one request at a time.
 * Upstash Redis REST API is already optimized for serverless - no pooling needed.
 *
 * Creating a pool would result in:
 * - 100 concurrent requests = 100 instances × 10 connections = 1000 Redis connections
 * - Instead of: 100 instances × 1 connection = 100 Redis connections
 */

let cachedClient: Redis | null = null;

/**
 * Get a singleton Redis client for this serverless instance.
 * The client is reused across function invocations within the same instance.
 */
function getClient(): Redis {
  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error('Redis credentials not configured');
  }

  cachedClient = new Redis({
    url,
    token,
    retry: {
      retries: 3,
      backoff: (retryCount) => Math.min(1000 * Math.pow(2, retryCount), 3000),
    },
  });

  return cachedClient;
}

/**
 * Create a new Redis client with sync token for read-your-writes consistency.
 */
function getClientWithSyncToken(syncToken: string): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error('Redis credentials not configured');
  }

  const client = new Redis({
    url,
    token,
    retry: {
      retries: 2,
      backoff: (retryCount) => Math.min(500 * Math.pow(2, retryCount), 2000),
    },
  });

  client.readYourWritesSyncToken = syncToken;
  return client;
}

/**
 * Backward-compatible wrapper that mimics the old pool API.
 * In reality, just returns a singleton client.
 */
export const redisPool = {
  getClient,
  getClientWithSyncToken,
  getPoolSize: () => 1, // Always 1 in serverless
  isInitialized: () => cachedClient !== null,
};

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
