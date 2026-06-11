/**
 * Redis-based Circuit Breaker for serverless environments.
 *
 * NOTE: In-memory circuit breaker doesn't work in serverless because:
 * - Each serverless instance has its own state
 * - Instance #1 opens circuit, but Instances #2-100 don't know
 * - Failing service continues to receive requests from other instances
 *
 * Redis-based solution:
 * - All instances share the same circuit state in Redis
 * - Atomic operations ensure consistent state transitions
 * - TTL handles automatic circuit reset
 */

import { redisPool } from '@/lib/redis-pool';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly state: CircuitState,
    public readonly nextRetryTime?: number,
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

interface CircuitBreakerOptions {
  name: string; // Circuit identifier (e.g., 'ai-api', 'database')
  failureThreshold?: number;
  successThreshold?: number;
  timeout?: number;
  resetTimeout?: number;
  onStateChange?: (oldState: CircuitState, newState: CircuitState) => void;
}

interface CircuitStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  rejectedCalls: number;
  state: CircuitState;
  lastFailureTime?: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
}

/**
 * Redis-based Circuit Breaker that works across serverless instances.
 */
export class CircuitBreaker {
  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeout: number;
  private readonly resetTimeout: number;
  private readonly onStateChange?: (oldState: CircuitState, newState: CircuitState) => void;

  private readonly stateKey: string;
  private readonly failureCountKey: string;
  private readonly successCountKey: string;
  private readonly lastFailureKey: string;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.successThreshold = options.successThreshold ?? 2;
    this.timeout = options.timeout ?? 60000;
    this.resetTimeout = options.resetTimeout ?? 30000;
    this.onStateChange = options.onStateChange;

    const prefix = `circuit:${this.name}`;
    this.stateKey = `${prefix}:state`;
    this.failureCountKey = `${prefix}:failures`;
    this.successCountKey = `${prefix}:successes`;
    this.lastFailureKey = `${prefix}:last_failure`;
  }

  async execute<T>(fn: () => Promise<T>, fallback?: () => T): Promise<T> {
    const redis = redisPool.getClient();
    const state = await this.getState();

    if (state === CircuitState.OPEN) {
      // Check if reset timeout has passed
      const lastFailure = await redis.get<string>(this.lastFailureKey);
      if (lastFailure) {
        const timeSinceFailure = Date.now() - parseInt(lastFailure, 10);
        if (timeSinceFailure < this.resetTimeout) {
          // Circuit still open
          if (fallback) {
            return fallback();
          }
          throw new CircuitBreakerError(
            `Circuit breaker is OPEN for ${this.name}`,
            CircuitState.OPEN,
            parseInt(lastFailure, 10) + this.resetTimeout,
          );
        }
      }

      // Reset timeout passed - try half-open
      await this.setState(CircuitState.HALF_OPEN);
    }

    try {
      const result = await fn();
      await this.recordSuccess();
      return result;
    } catch (error) {
      await this.recordFailure();

      if (fallback) {
        return fallback();
      }
      throw error;
    }
  }

  private async getState(): Promise<CircuitState> {
    const redis = redisPool.getClient();
    const state = await redis.get<string>(this.stateKey);
    return (state as CircuitState) || CircuitState.CLOSED;
  }

  private async setState(newState: CircuitState): Promise<void> {
    const redis = redisPool.getClient();
    const oldState = await this.getState();

    await redis.set(this.stateKey, newState, {
      ex: Math.ceil(this.timeout / 1000),
    });

    if (oldState !== newState && this.onStateChange) {
      this.onStateChange(oldState, newState);
    }
  }

  private async recordSuccess(): Promise<void> {
    const redis = redisPool.getClient();
    const state = await this.getState();

    if (state === CircuitState.HALF_OPEN) {
      // Increment success count in half-open state
      const successes = await redis.incr(this.successCountKey);

      if (successes >= this.successThreshold) {
        // Enough successes - close circuit
        await this.setState(CircuitState.CLOSED);
        await redis.del(this.failureCountKey);
        await redis.del(this.successCountKey);
        await redis.del(this.lastFailureKey);
      }
    } else if (state === CircuitState.CLOSED) {
      // Reset failure count on success
      await redis.del(this.failureCountKey);
    }
  }

  private async recordFailure(): Promise<void> {
    const redis = redisPool.getClient();
    const state = await this.getState();

    await redis.set(this.lastFailureKey, Date.now().toString(), {
      ex: Math.ceil(this.resetTimeout / 1000),
    });

    if (state === CircuitState.HALF_OPEN) {
      // Failure in half-open - reopen circuit
      await this.setState(CircuitState.OPEN);
      await redis.del(this.successCountKey);
      return;
    }

    // Increment failure count
    const failures = await redis.incr(this.failureCountKey);
    await redis.expire(this.failureCountKey, Math.ceil(this.timeout / 1000));

    if (failures >= this.failureThreshold) {
      // Too many failures - open circuit
      await this.setState(CircuitState.OPEN);
    }
  }

  async getStats(): Promise<CircuitStats> {
    const redis = redisPool.getClient();
    const state = await this.getState();
    const failures = await redis.get<string>(this.failureCountKey);
    const successes = await redis.get<string>(this.successCountKey);
    const lastFailure = await redis.get<string>(this.lastFailureKey);

    return {
      totalCalls: 0, // Not tracked in serverless version
      successfulCalls: 0,
      failedCalls: 0,
      rejectedCalls: 0,
      state,
      lastFailureTime: lastFailure ? parseInt(lastFailure, 10) : undefined,
      consecutiveFailures: failures ? parseInt(failures, 10) : 0,
      consecutiveSuccesses: successes ? parseInt(successes, 10) : 0,
    };
  }

  async reset(): Promise<void> {
    const redis = redisPool.getClient();
    await redis.del(this.stateKey);
    await redis.del(this.failureCountKey);
    await redis.del(this.successCountKey);
    await redis.del(this.lastFailureKey);
  }
}

/**
 * Global circuit breakers for common services.
 */
const circuitBreakers = new Map<string, CircuitBreaker>();

function getCircuitBreaker(
  name: string,
  options?: Omit<CircuitBreakerOptions, 'name'>,
): CircuitBreaker {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(
      name,
      new CircuitBreaker({
        name,
        ...options,
        onStateChange: (oldState, newState) => {
          console.log(`Circuit breaker '${name}' changed: ${oldState} -> ${newState}`);
          options?.onStateChange?.(oldState, newState);
        },
      }),
    );
  }
  return circuitBreakers.get(name)!;
}

export const aiCircuitBreaker = getCircuitBreaker('ai-api', {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 180_000, // 3 minutes
  resetTimeout: 60_000, // 1 minute
});

export async function executeWithCircuitBreaker<T>(
  fn: () => Promise<T>,
  fallback?: () => T,
): Promise<T> {
  return aiCircuitBreaker.execute(fn, fallback);
}

export async function getCircuitBreakerStats(): Promise<CircuitStats> {
  return aiCircuitBreaker.getStats();
}

export async function resetCircuitBreaker(): Promise<void> {
  return aiCircuitBreaker.reset();
}
