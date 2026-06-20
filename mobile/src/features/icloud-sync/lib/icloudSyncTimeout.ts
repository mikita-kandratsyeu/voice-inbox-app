import { calculateSyncTimeout } from '@/features/git-remote-sync/lib/syncOptimization';

import { ICLOUD_SYNC_TIMEOUT_MS } from './constants';

export const ICLOUD_SYNC_TIMEOUT_ERROR = 'icloud_sync_timeout';

export function isIcloudSyncTimeoutError(err: unknown): boolean {
  return (
    err instanceof Error &&
    'code' in err &&
    (err as Error & { code?: string }).code === ICLOUD_SYNC_TIMEOUT_ERROR
  );
}

export function withIcloudSyncTimeout<T>(promise: Promise<T>, timeoutMs?: number): Promise<T> {
  const effectiveTimeout = timeoutMs ?? ICLOUD_SYNC_TIMEOUT_MS;

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        Object.assign(new Error(ICLOUD_SYNC_TIMEOUT_ERROR), { code: ICLOUD_SYNC_TIMEOUT_ERROR }),
      );
    }, effectiveTimeout);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export function calculateIcloudSyncTimeout(fileCount: number): number {
  return calculateSyncTimeout(fileCount);
}
