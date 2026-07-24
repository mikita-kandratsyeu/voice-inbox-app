import {
  REMOTE_SYNC_BASE_TIMEOUT_MS,
  REMOTE_SYNC_DEFAULT_CONCURRENCY,
  REMOTE_SYNC_MAX_CONCURRENCY,
  REMOTE_SYNC_MAX_TIMEOUT_MS,
  REMOTE_SYNC_MIN_CONCURRENCY,
  REMOTE_SYNC_PER_FILE_TIMEOUT_MS,
} from './constants';

/**
 * Calculate optimal concurrency for blob uploads based on file count.
 * Uses adaptive strategy to balance speed and API pressure.
 *
 * @param fileCount Number of files to upload
 * @returns Optimal concurrency level (2-8)
 */
export function calculateOptimalConcurrency(fileCount: number): number {
  if (fileCount <= 0) {
    return REMOTE_SYNC_MIN_CONCURRENCY;
  }

  if (fileCount <= 5) {
    return REMOTE_SYNC_MIN_CONCURRENCY;
  }

  if (fileCount <= 20) {
    return REMOTE_SYNC_DEFAULT_CONCURRENCY;
  }

  const calculated = Math.min(Math.ceil(fileCount / 10), REMOTE_SYNC_MAX_CONCURRENCY);

  return Math.max(REMOTE_SYNC_MIN_CONCURRENCY, calculated);
}

/**
 * Calculate dynamic timeout for sync operation based on file count.
 * Scales timeout to prevent premature failures on large syncs.
 *
 * @param fileCount Number of files to sync
 * @returns Timeout in milliseconds
 */
export function calculateSyncTimeout(fileCount: number): number {
  if (fileCount <= 0) {
    return REMOTE_SYNC_BASE_TIMEOUT_MS;
  }

  const calculated = REMOTE_SYNC_BASE_TIMEOUT_MS + fileCount * REMOTE_SYNC_PER_FILE_TIMEOUT_MS;

  return Math.min(calculated, REMOTE_SYNC_MAX_TIMEOUT_MS);
}
