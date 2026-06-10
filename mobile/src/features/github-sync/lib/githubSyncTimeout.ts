import { GITHUB_SYNC_TIMEOUT_MS } from './constants';

export const GITHUB_SYNC_TIMEOUT_ERROR = 'github_sync_timeout';

export function isGithubSyncTimeoutError(err: unknown): boolean {
  return (
    err instanceof Error &&
    'code' in err &&
    (err as Error & { code?: string }).code === GITHUB_SYNC_TIMEOUT_ERROR
  );
}

export function withGithubSyncTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = GITHUB_SYNC_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(Object.assign(new Error(GITHUB_SYNC_TIMEOUT_ERROR), { code: GITHUB_SYNC_TIMEOUT_ERROR }));
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
