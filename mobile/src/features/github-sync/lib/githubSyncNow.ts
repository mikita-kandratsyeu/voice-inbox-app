import { GITHUB_SYNC_COOLDOWN_MS } from './constants';
import { setGithubSyncSessionActive } from './githubSyncSession';
import type { PushGithubCommitResult } from './pushGithubCommit';

export type GithubSyncNowResult =
  | PushGithubCommitResult
  | { ok: false; code: 'sync_in_progress' }
  | { ok: false; code: 'sync_cooldown'; retryAfterSec: number };

let githubSyncInFlight = false;
let githubSyncLastAttemptAt = 0;

export function resetGithubSyncNowStateForTests(): void {
  githubSyncInFlight = false;
  githubSyncLastAttemptAt = 0;
  setGithubSyncSessionActive(false);
}

export function isGithubSyncNowInFlight(): boolean {
  return githubSyncInFlight;
}

export async function runGithubSyncNow(params: {
  isProActive: boolean;
  isConnected: boolean;
  push: () => Promise<PushGithubCommitResult>;
}): Promise<GithubSyncNowResult> {
  if (!params.isProActive) {
    return { ok: false, code: 'pro_required' };
  }
  if (githubSyncInFlight) {
    return { ok: false, code: 'sync_in_progress' };
  }
  const cooldownRemainingMs = GITHUB_SYNC_COOLDOWN_MS - (Date.now() - githubSyncLastAttemptAt);
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

  githubSyncInFlight = true;
  githubSyncLastAttemptAt = Date.now();
  setGithubSyncSessionActive(true);
  try {
    return await params.push();
  } finally {
    githubSyncInFlight = false;
    setGithubSyncSessionActive(false);
  }
}
