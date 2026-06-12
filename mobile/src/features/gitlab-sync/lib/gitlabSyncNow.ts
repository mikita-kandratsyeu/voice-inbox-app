import { createRemoteSyncNowController } from '@/features/git-remote-sync/lib/runRemoteSyncNow';

import { GITLAB_SYNC_COOLDOWN_MS } from './constants';
import type { PushGitlabCommitResult } from './pushGitlabCommit';
import { setGitlabSyncSessionActive } from './gitlabSyncSession';

export type GitlabSyncNowResult =
  | PushGitlabCommitResult
  | { ok: false; code: 'sync_in_progress' }
  | { ok: false; code: 'sync_cooldown'; retryAfterSec: number };

const gitlabSyncNowController = createRemoteSyncNowController({
  cooldownMs: GITLAB_SYNC_COOLDOWN_MS,
  setSessionActive: setGitlabSyncSessionActive,
});

export function resetGitlabSyncNowStateForTests(): void {
  gitlabSyncNowController.resetForTests();
}

export function isGitlabSyncNowInFlight(): boolean {
  return gitlabSyncNowController.isInFlight();
}

export const runGitlabSyncNow = gitlabSyncNowController.run;
