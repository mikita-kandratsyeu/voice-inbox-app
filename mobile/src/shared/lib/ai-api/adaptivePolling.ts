/**
 * Server hints from polling response for adaptive interval calculation.
 */
export type ServerPollHint = {
  /** Recommended next poll interval from server (ms) */
  retryAfterMs?: number;
  /** Estimated time until completion (ms) */
  estimatedCompletionMs?: number;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Absolute UTC poll deadline from server (ISO-8601). */
  pollExpiresAt?: string;
};

/**
 * Job types with different processing characteristics.
 */
export type PollJobType =
  | 'summary'
  | 'ask'
  | 'meeting_dialogue'
  | 'translate'
  | 'digest'
  | 'auto_organize';

/**
 * Adaptive polling strategy that adjusts intervals based on:
 * - Server hints (retry-after, progress, ETA)
 * - Job type (fast vs slow operations)
 * - Poll attempt count
 * - Historical completion times
 */
export class AdaptivePollingStrategy {
  private pollHistory: number[] = [];

  /**
   * Calculates optimal next poll interval.
   * Priority: server hint > progress-based > job-type default + backoff.
   *
   * @param currentAttempt - Poll attempt number (0-indexed)
   * @param serverHint - Optional hints from last server response
   * @param jobType - Type of job being polled
   * @returns Interval in milliseconds until next poll
   */
  getNextInterval(
    currentAttempt: number,
    serverHint?: ServerPollHint,
    jobType?: PollJobType,
  ): number {
    // 1. Server hint takes absolute priority
    if (serverHint?.retryAfterMs && serverHint.retryAfterMs > 0) {
      return this.clampInterval(serverHint.retryAfterMs, jobType);
    }

    // 2. Progress-aware polling: accelerate near completion
    if (serverHint?.progress !== undefined && serverHint.progress >= 0) {
      const progressInterval = this.getProgressAwareInterval(serverHint.progress, jobType);
      if (progressInterval) {
        return progressInterval;
      }
    }

    // 3. Fallback: job-type base + smooth exponential backoff
    const baseInterval = this.getBaseInterval(jobType);
    const attempt = Math.min(currentAttempt, 15); // Cap exponential growth

    // Smoother multiplier: 1.0x → 1.3x → 1.6x → 1.9x → 2.2x...
    const multiplier = 1 + attempt * 0.3;

    const interval = baseInterval * multiplier;

    return this.clampInterval(interval, jobType);
  }

  /**
   * Returns aggressive poll interval when job is near completion.
   */
  private getProgressAwareInterval(progress: number, _jobType?: PollJobType): number | null {
    // Progress thresholds for fast polling
    if (progress >= 90) {
      return 800; // Very close - poll every 800ms
    }
    if (progress >= 75) {
      return 1_500; // Close - poll every 1.5s
    }
    if (progress >= 50) {
      return 2_500; // Half done - poll every 2.5s
    }

    // Early stage - use job-type defaults
    return null;
  }

  /**
   * Base polling interval by job type (ms).
   * Tuned based on typical processing duration.
   */
  private getBaseInterval(jobType?: PollJobType): number {
    switch (jobType) {
      case 'ask':
        return 800; // Ask queries are fastest (5-15s typical)
      case 'translate':
        return 1_000; // Translation is fast (10-20s)
      case 'summary':
        return 1_500; // Standard summary (20-40s)
      case 'meeting_dialogue':
        return 3_000; // Long meetings (60-120s+)
      case 'digest':
        return 4_000; // Weekly digest is heavy (120s+)
      case 'auto_organize':
        return 2_000; // Folder organization (30-60s)
      default:
        return 1_500; // Sensible default
    }
  }

  /**
   * Clamps interval to job-specific min/max bounds.
   */
  private clampInterval(intervalMs: number, jobType?: PollJobType): number {
    const min = 500; // Never poll faster than 500ms
    const max = this.getMaxInterval(jobType);

    return Math.max(min, Math.min(intervalMs, max));
  }

  /**
   * Maximum poll interval by job type.
   * Fast jobs poll more frequently to reduce perceived latency.
   */
  private getMaxInterval(jobType?: PollJobType): number {
    switch (jobType) {
      case 'ask':
      case 'translate':
        return 5_000; // Fast jobs: max 5s interval
      case 'summary':
      case 'auto_organize':
        return 8_000; // Medium jobs: max 8s interval
      case 'meeting_dialogue':
      case 'digest':
        return 12_000; // Slow jobs: max 12s interval
      default:
        return 10_000; // Default cap
    }
  }

  /**
   * Records completion time for historical analysis.
   * Keeps last 20 samples for moving average.
   */
  recordPollDuration(durationMs: number): void {
    this.pollHistory.push(durationMs);

    // Keep only last 20 samples
    if (this.pollHistory.length > 20) {
      this.pollHistory.shift();
    }
  }

  /**
   * Estimates remaining time based on historical completion durations.
   * Returns null if insufficient data.
   */
  estimateRemainingTime(elapsedMs: number): number | null {
    if (this.pollHistory.length < 3) {
      return null; // Need at least 3 samples
    }

    // Calculate moving average
    const sum = this.pollHistory.reduce((acc, val) => acc + val, 0);
    const avgDuration = sum / this.pollHistory.length;

    // Estimate remaining
    const remaining = Math.max(0, avgDuration - elapsedMs);

    return remaining;
  }

  /**
   * Returns polling statistics for monitoring.
   */
  getStats(): {
    sampleCount: number;
    avgDurationMs: number | null;
  } {
    if (this.pollHistory.length === 0) {
      return { sampleCount: 0, avgDurationMs: null };
    }

    const sum = this.pollHistory.reduce((acc, val) => acc + val, 0);
    const avgDurationMs = sum / this.pollHistory.length;

    return {
      sampleCount: this.pollHistory.length,
      avgDurationMs: Math.round(avgDurationMs),
    };
  }
}
