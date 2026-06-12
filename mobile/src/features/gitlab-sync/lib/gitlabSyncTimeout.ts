import { GITLAB_SYNC_TIMEOUT_MS } from './constants';

export const GITLAB_SYNC_TIMEOUT_ERROR = 'gitlab_sync_timeout';

export function isGitlabSyncTimeoutError(err: unknown): boolean {
  return (
    err instanceof Error &&
    'code' in err &&
    (err as Error & { code?: string }).code === GITLAB_SYNC_TIMEOUT_ERROR
  );
}

export function withGitlabSyncTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = GITLAB_SYNC_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        Object.assign(new Error(GITLAB_SYNC_TIMEOUT_ERROR), { code: GITLAB_SYNC_TIMEOUT_ERROR }),
      );
    }, timeoutMs);

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
