import { calculateSyncTimeout } from '@/features/git-remote-sync/lib/syncOptimization';

import { GITLAB_SYNC_TIMEOUT_MS } from './constants';

export const GITLAB_SYNC_TIMEOUT_ERROR = 'gitlab_sync_timeout';

export function isGitlabSyncTimeoutError(err: unknown): boolean {
  return (
    err instanceof Error &&
    'code' in err &&
    (err as Error & { code?: string }).code === GITLAB_SYNC_TIMEOUT_ERROR
  );
}

export function withGitlabSyncTimeout<T>(promise: Promise<T>, timeoutMs?: number): Promise<T> {
  const effectiveTimeout = timeoutMs ?? GITLAB_SYNC_TIMEOUT_MS;

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        Object.assign(new Error(GITLAB_SYNC_TIMEOUT_ERROR), { code: GITLAB_SYNC_TIMEOUT_ERROR }),
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

export function calculateGitlabSyncTimeout(fileCount: number): number {
  return calculateSyncTimeout(fileCount);
}
