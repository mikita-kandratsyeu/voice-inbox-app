import { createRemoteSyncNowController } from '@/features/git-remote-sync/lib/runRemoteSyncNow';

import { GITHUB_SYNC_COOLDOWN_MS } from './constants';
import { setGithubSyncSessionActive } from './githubSyncSession';
import type { PushGithubCommitResult } from './pushGithubCommit';

export type GithubSyncNowResult =
  | PushGithubCommitResult
  | { ok: false; code: 'sync_in_progress' }
  | { ok: false; code: 'sync_cooldown'; retryAfterSec: number };

const githubSyncNowController = createRemoteSyncNowController({
  cooldownMs: GITHUB_SYNC_COOLDOWN_MS,
  setSessionActive: setGithubSyncSessionActive,
});

export function resetGithubSyncNowStateForTests(): void {
  githubSyncNowController.resetForTests();
}

export function isGithubSyncNowInFlight(): boolean {
  return githubSyncNowController.isInFlight();
}

export const runGithubSyncNow = githubSyncNowController.run;
