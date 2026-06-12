import { GITLAB_SYNC_COOLDOWN_MS } from './constants';
import { setGitlabSyncSessionActive } from './gitlabSyncSession';
import type { PushGitlabCommitResult } from './pushGitlabCommit';

export type GitlabSyncNowResult =
  | PushGitlabCommitResult
  | { ok: false; code: 'sync_in_progress' }
  | { ok: false; code: 'sync_cooldown'; retryAfterSec: number };

let gitlabSyncInFlight = false;
let gitlabSyncLastAttemptAt = 0;

export function resetGitlabSyncNowStateForTests(): void {
  gitlabSyncInFlight = false;
  gitlabSyncLastAttemptAt = 0;
  setGitlabSyncSessionActive(false);
}

export function isGitlabSyncNowInFlight(): boolean {
  return gitlabSyncInFlight;
}

export async function runGitlabSyncNow(params: {
  isProActive: boolean;
  isConnected: boolean;
  push: () => Promise<PushGitlabCommitResult>;
}): Promise<GitlabSyncNowResult> {
  if (!params.isProActive) {
    return { ok: false, code: 'pro_required' };
  }
  if (gitlabSyncInFlight) {
    return { ok: false, code: 'sync_in_progress' };
  }
  const cooldownRemainingMs = GITLAB_SYNC_COOLDOWN_MS - (Date.now() - gitlabSyncLastAttemptAt);
  if (cooldownRemainingMs > 0) {
    return {
      ok: false,
      code: 'sync_cooldown',
      retryAfterSec: Math.ceil(cooldownRemainingMs / 1000),
    };
  }
  if (!params.isConnected) {
    return { ok: false, code: 'not_connected' };
  }

  gitlabSyncInFlight = true;
  gitlabSyncLastAttemptAt = Date.now();
  setGitlabSyncSessionActive(true);
  try {
    return await params.push();
  } finally {
    gitlabSyncInFlight = false;
    setGitlabSyncSessionActive(false);
  }
}
