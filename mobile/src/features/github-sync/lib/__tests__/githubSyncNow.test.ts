import { GITHUB_SYNC_COOLDOWN_MS } from '../constants';
import {
  isGithubSyncNowInFlight,
  resetGithubSyncNowStateForTests,
  runGithubSyncNow,
} from '../githubSyncNow';
import { isGithubSyncSessionActive } from '../githubSyncSession';
import type { PushGithubCommitResult } from '../pushGithubCommit';

describe('githubSyncNow', () => {
  beforeEach(() => {
    resetGithubSyncNowStateForTests();
  });

  it('returns pro_required when pro is inactive', async () => {
    await expect(
      runGithubSyncNow({
        isProActive: false,
        isConnected: true,
        push: jest.fn(),
      }),
    ).resolves.toEqual({ ok: false, code: 'pro_required' });
  });

  it('returns not_connected when secrets are missing', async () => {
    await expect(
      runGithubSyncNow({
        isProActive: true,
        isConnected: false,
        push: jest.fn(),
      }),
    ).resolves.toEqual({ ok: false, code: 'not_connected' });
  });

  it('activates the shared sync session while push is running', async () => {
    let resolvePush:
      | ((value: { ok: true; commitSha: string; alreadyUpToDate: boolean }) => void)
      | undefined;
    const push = jest.fn(
      () =>
        new Promise<{ ok: true; commitSha: string; alreadyUpToDate: boolean }>((resolve) => {
          resolvePush = resolve;
        }),
    );

    const syncPromise = runGithubSyncNow({
      isProActive: true,
      isConnected: true,
      push,
    });

    await Promise.resolve();

    expect(isGithubSyncNowInFlight()).toBe(true);
    expect(isGithubSyncSessionActive()).toBe(true);

    resolvePush?.({
      ok: true,
      commitSha: 'commit-sha',
      alreadyUpToDate: false,
    });

    await expect(syncPromise).resolves.toEqual({
      ok: true,
      commitSha: 'commit-sha',
      alreadyUpToDate: false,
    });
    expect(isGithubSyncNowInFlight()).toBe(false);
    expect(isGithubSyncSessionActive()).toBe(false);
  });

  it('returns sync_in_progress while another sync is active', async () => {
    const push = jest.fn((): Promise<PushGithubCommitResult> => new Promise(() => {}));

    void runGithubSyncNow({
      isProActive: true,
      isConnected: true,
      push,
    });
    await Promise.resolve();

    await expect(
      runGithubSyncNow({
        isProActive: true,
        isConnected: true,
        push,
      }),
    ).resolves.toEqual({ ok: false, code: 'sync_in_progress' });
  });

  it('returns sync_cooldown shortly after a sync attempt', async () => {
    jest.useFakeTimers();
    const push = jest.fn().mockResolvedValue({
      ok: true,
      commitSha: 'commit-sha',
      alreadyUpToDate: false,
    });

    await runGithubSyncNow({
      isProActive: true,
      isConnected: true,
      push,
    });

    jest.advanceTimersByTime(GITHUB_SYNC_COOLDOWN_MS - 1);

    await expect(
      runGithubSyncNow({
        isProActive: true,
        isConnected: true,
        push,
      }),
    ).resolves.toEqual({
      ok: false,
      code: 'sync_cooldown',
      retryAfterSec: 1,
    });

    jest.useRealTimers();
  });

  it('clears the session flag when push fails', async () => {
    const push = jest.fn().mockRejectedValue(new Error('network down'));

    await expect(
      runGithubSyncNow({
        isProActive: true,
        isConnected: true,
        push,
      }),
    ).rejects.toThrow('network down');

    expect(isGithubSyncSessionActive()).toBe(false);
  });
});
