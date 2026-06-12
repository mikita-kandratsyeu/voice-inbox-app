import { GITLAB_SYNC_COOLDOWN_MS } from '../constants';
import {
  isGitlabSyncNowInFlight,
  resetGitlabSyncNowStateForTests,
  runGitlabSyncNow,
} from '../gitlabSyncNow';
import { isGitlabSyncSessionActive } from '../gitlabSyncSession';
import type { PushGitlabCommitResult } from '../pushGitlabCommit';

describe('gitlabSyncNow', () => {
  beforeEach(() => {
    resetGitlabSyncNowStateForTests();
  });

  it('returns pro_required when pro is inactive', async () => {
    await expect(
      runGitlabSyncNow({
        isProActive: false,
        isConnected: true,
        push: jest.fn(),
      }),
    ).resolves.toEqual({ ok: false, code: 'pro_required' });
  });

  it('returns not_connected when secrets are missing', async () => {
    await expect(
      runGitlabSyncNow({
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

    const syncPromise = runGitlabSyncNow({
      isProActive: true,
      isConnected: true,
      push,
    });

    await Promise.resolve();

    expect(isGitlabSyncNowInFlight()).toBe(true);
    expect(isGitlabSyncSessionActive()).toBe(true);

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
    expect(isGitlabSyncNowInFlight()).toBe(false);
    expect(isGitlabSyncSessionActive()).toBe(false);
  });

  it('returns sync_in_progress while another sync is active', async () => {
    const push = jest.fn((): Promise<PushGitlabCommitResult> => new Promise(() => {}));

    void runGitlabSyncNow({
      isProActive: true,
      isConnected: true,
      push,
    });
    await Promise.resolve();

    await expect(
      runGitlabSyncNow({
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

    await runGitlabSyncNow({
      isProActive: true,
      isConnected: true,
      push,
    });

    jest.advanceTimersByTime(GITLAB_SYNC_COOLDOWN_MS - 1);

    await expect(
      runGitlabSyncNow({
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
      runGitlabSyncNow({
        isProActive: true,
        isConnected: true,
        push,
      }),
    ).rejects.toThrow('network down');

    expect(isGitlabSyncSessionActive()).toBe(false);
  });
});
