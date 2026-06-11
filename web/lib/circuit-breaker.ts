/**
 * Circuit Breaker implementation to protect against cascading failures.
 * Prevents repeated calls to a failing service by opening the circuit
 * after a threshold of failures.
 */

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

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private nextRetryTime = 0;

  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeout: number;
  private readonly resetTimeout: number;
  private readonly onStateChange?: (oldState: CircuitState, newState: CircuitState) => void;

  private stats: CircuitStats = {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    rejectedCalls: 0,
    state: CircuitState.CLOSED,
    consecutiveFailures: 0,
    consecutiveSuccesses: 0,
  };

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.successThreshold = options.successThreshold ?? 2;
    this.timeout = options.timeout ?? 60000;
    this.resetTimeout = options.resetTimeout ?? 30000;
    this.onStateChange = options.onStateChange;
  }

  async execute<T>(fn: () => Promise<T>, fallback?: () => T): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      const now = Date.now();
      if (now < this.nextRetryTime) {
        this.stats.rejectedCalls++;
        if (fallback) {
          return fallback();
        }
        throw new CircuitBreakerError(
          `Circuit breaker is OPEN. Next retry at ${new Date(this.nextRetryTime).toISOString()}`,
          CircuitState.OPEN,
          this.nextRetryTime,
        );
      }
      this.transitionTo(CircuitState.HALF_OPEN);
    }

    this.stats.totalCalls++;

    try {
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback && this.state === CircuitState.OPEN) {
        return fallback();
      }
      throw error;
    }
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Circuit breaker timeout')), this.timeout),
      ),
    ]);
  }

  private onSuccess(): void {
    this.stats.successfulCalls++;
    this.failureCount = 0;
    this.successCount++;
    this.stats.consecutiveSuccesses++;
    this.stats.consecutiveFailures = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successCount >= this.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.stats.failedCalls++;
    this.failureCount++;
    this.successCount = 0;
    this.lastFailureTime = Date.now();
    this.stats.lastFailureTime = this.lastFailureTime;
    this.stats.consecutiveFailures++;
    this.stats.consecutiveSuccesses = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionTo(CircuitState.OPEN);
      this.nextRetryTime = Date.now() + this.resetTimeout;
    } else if (this.failureCount >= this.failureThreshold) {
      this.transitionTo(CircuitState.OPEN);
      this.nextRetryTime = Date.now() + this.resetTimeout;
    }
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    if (oldState !== newState) {
      this.state = newState;
      this.stats.state = newState;
      if (newState === CircuitState.CLOSED) {
        this.failureCount = 0;
        this.successCount = 0;
      }
      this.onStateChange?.(oldState, newState);
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats(): Readonly<CircuitStats> {
    return { ...this.stats };
  }

  reset(): void {
    this.transitionTo(CircuitState.CLOSED);
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.nextRetryTime = 0;
  }
}

const aiCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 180000,
  resetTimeout: 60000,
  onStateChange: (oldState, newState) => {
    console.log(`Circuit breaker state changed: ${oldState} → ${newState}`);
  },
});

export async function executeWithCircuitBreaker<T>(
  fn: () => Promise<T>,
  fallback?: () => T,
): Promise<T> {
  return aiCircuitBreaker.execute(fn, fallback);
}

export function getCircuitBreakerStats(): Readonly<CircuitStats> {
  return aiCircuitBreaker.getStats();
}

export function resetCircuitBreaker(): void {
  aiCircuitBreaker.reset();
}
