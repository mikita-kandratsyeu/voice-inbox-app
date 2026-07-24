import { GITLAB_SYNC_TIMEOUT_MS } from '../constants';
import {
  GITLAB_SYNC_TIMEOUT_ERROR,
  isGitlabSyncTimeoutError,
  withGitlabSyncTimeout,
} from '../gitlabSyncTimeout';

describe('gitlabSyncTimeout', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves when the wrapped promise completes in time', async () => {
    await expect(withGitlabSyncTimeout(Promise.resolve('done'))).resolves.toBe('done');
  });

  it('rejects with a timeout error when the budget is exceeded', async () => {
    jest.useFakeTimers();

    const resultPromise = withGitlabSyncTimeout(new Promise<string>(() => {}), 1_000);
    const expectation = expect(resultPromise).rejects.toMatchObject({
      message: GITLAB_SYNC_TIMEOUT_ERROR,
      code: GITLAB_SYNC_TIMEOUT_ERROR,
    });

    await jest.advanceTimersByTimeAsync(1_001);
    await expectation;
    expect(
      isGitlabSyncTimeoutError(
        Object.assign(new Error(GITLAB_SYNC_TIMEOUT_ERROR), {
          code: GITLAB_SYNC_TIMEOUT_ERROR,
        }),
      ),
    ).toBe(true);
  });

  it('uses the default sync timeout budget', async () => {
    jest.useFakeTimers();

    const resultPromise = withGitlabSyncTimeout(new Promise<string>(() => {}));
    const expectation = expect(resultPromise).rejects.toMatchObject({
      code: GITLAB_SYNC_TIMEOUT_ERROR,
    });

    await jest.advanceTimersByTimeAsync(GITLAB_SYNC_TIMEOUT_MS + 1);
    await expectation;
  });

  it('forwards errors from the wrapped promise', async () => {
    await expect(withGitlabSyncTimeout(Promise.reject(new Error('boom')))).rejects.toThrow('boom');
  });
});
