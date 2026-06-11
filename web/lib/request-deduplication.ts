/**
 * Redis-based request deduplication for serverless environments.
 *
 * NOTE: In-memory deduplication doesn't work in serverless because:
 * - Each serverless instance has its own memory space
 * - Duplicate requests often hit different instances
 * - In-memory Map is NOT shared across instances
 *
 * Redis-based solution works because:
 * - All instances share the same Redis store
 * - SET NX (set if not exists) is atomic
 * - TTL automatically cleans up old entries
 */

import { Redis } from '@upstash/redis';
import { redisPool } from '@/lib/redis-pool';

const DEDUP_KEY_PREFIX = 'dedup:';

/**
 * Execute a function with Redis-based deduplication.
 * If the same key is already being processed by ANY instance, waits for the result.
 */
export async function withDeduplication<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs = 5000,
): Promise<T> {
  const redis = redisPool.getClient();
  const redisKey = `${DEDUP_KEY_PREFIX}${key}`;
  const lockKey = `${redisKey}:lock`;
  const resultKey = `${redisKey}:result`;
  const ttlSeconds = Math.ceil(ttlMs / 1000);

  // Try to acquire lock
  const acquired = await redis.set(lockKey, '1', {
    nx: true, // Only set if not exists
    ex: ttlSeconds,
  });

  if (acquired === 'OK') {
    // We got the lock - execute the function
    try {
      const result = await fn();

      // Store result for other instances
      await redis.set(resultKey, JSON.stringify(result), {
        ex: ttlSeconds,
      });

      // Release lock
      await redis.del(lockKey);

      return result;
    } catch (error) {
      // Release lock on error
      await redis.del(lockKey);
      throw error;
    }
  }

  // Lock already held by another instance - wait for result
  const maxWaitMs = ttlMs;
  const pollIntervalMs = 100;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    // Check if result is ready
    const cached = await redis.get<string>(resultKey);
    if (cached) {
      try {
        return JSON.parse(cached) as T;
      } catch {
        // Invalid JSON - fall through to re-execute
        break;
      }
    }

    // Check if lock is still held
    const lockExists = await redis.exists(lockKey);
    if (!lockExists) {
      // Lock released but no result - original execution failed
      // Try to acquire lock and execute ourselves
      break;
    }

    // Wait before polling again
    await sleep(pollIntervalMs);
  }

  // Timeout or lock released without result - execute ourselves
  return fn();
}

/**
 * Get deduplication key for message creation.
 */
export function getMessageDeduplicationKey(deviceId: string, messageId: string): string {
  return `msg:${deviceId}:${messageId}`;
}

/**
 * Get deduplication key for ask queries.
 */
export function getAskDeduplicationKey(deviceId: string, messageId: string, query: string): string {
  // Hash the query to keep key size reasonable
  const queryHash = simpleHash(query);
  return `ask:${deviceId}:${messageId}:${queryHash}`;
}

/**
 * Simple hash function for deduplication keys.
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Legacy class-based API for backward compatibility.
 * Internally uses Redis-based implementation.
 */
export class RequestDeduplicator {
  private readonly defaultTtlMs: number;

  constructor(defaultTtlMs = 5000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  async execute<T>(key: string, fn: () => Promise<T>, ttlMs?: number): Promise<T> {
    return withDeduplication(key, fn, ttlMs ?? this.defaultTtlMs);
  }

  isPending(): boolean {
    // Not supported in Redis-based version
    return false;
  }

  getPendingCount(): number {
    // Not supported in Redis-based version
    return 0;
  }

  clear(): void {
    // Not needed - Redis TTL handles cleanup
  }

  clearAll(): void {
    // Not needed - Redis TTL handles cleanup
  }
}
