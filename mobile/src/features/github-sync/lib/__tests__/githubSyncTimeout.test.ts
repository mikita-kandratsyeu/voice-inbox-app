import { GITHUB_SYNC_TIMEOUT_MS } from '../constants';
import {
  GITHUB_SYNC_TIMEOUT_ERROR,
  isGithubSyncTimeoutError,
  withGithubSyncTimeout,
} from '../githubSyncTimeout';

describe('githubSyncTimeout', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves when the wrapped promise completes in time', async () => {
    await expect(withGithubSyncTimeout(Promise.resolve('done'))).resolves.toBe('done');
  });

  it('rejects with a timeout error when the budget is exceeded', async () => {
    jest.useFakeTimers();

    const resultPromise = withGithubSyncTimeout(new Promise<string>(() => {}), 1_000);
    const expectation = expect(resultPromise).rejects.toMatchObject({
      message: GITHUB_SYNC_TIMEOUT_ERROR,
      code: GITHUB_SYNC_TIMEOUT_ERROR,
    });

    await jest.advanceTimersByTimeAsync(1_001);
    await expectation;
    expect(
      isGithubSyncTimeoutError(
        Object.assign(new Error(GITHUB_SYNC_TIMEOUT_ERROR), {
          code: GITHUB_SYNC_TIMEOUT_ERROR,
        }),
      ),
    ).toBe(true);
  });

  it('uses the default sync timeout budget', async () => {
    jest.useFakeTimers();

    const resultPromise = withGithubSyncTimeout(new Promise<string>(() => {}));
    const expectation = expect(resultPromise).rejects.toMatchObject({
      code: GITHUB_SYNC_TIMEOUT_ERROR,
    });

    await jest.advanceTimersByTimeAsync(GITHUB_SYNC_TIMEOUT_MS + 1);
    await expectation;
  });

  it('forwards errors from the wrapped promise', async () => {
    await expect(withGithubSyncTimeout(Promise.reject(new Error('boom')))).rejects.toThrow('boom');
  });
});
