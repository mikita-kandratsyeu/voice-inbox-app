import type { PushRemoteCommitResult } from './pushRemoteCommit';

export type RemoteSyncNowResult =
  | PushRemoteCommitResult
  | { ok: false; code: 'sync_in_progress' }
  | { ok: false; code: 'sync_cooldown'; retryAfterSec: number };

export type RemoteSyncNowController = {
  isInFlight: () => boolean;
  resetForTests: () => void;
  run: (params: {
    isProActive: boolean;
    isConnected: boolean;
    push: () => Promise<PushRemoteCommitResult>;
  }) => Promise<RemoteSyncNowResult>;
};

export function createRemoteSyncNowController(options: {
  cooldownMs: number;
  setSessionActive: (active: boolean) => void;
}): RemoteSyncNowController {
  let inFlight = false;
  let lastAttemptAt = 0;

  return {
    isInFlight: () => inFlight,
    resetForTests: () => {
      inFlight = false;
      lastAttemptAt = 0;
      options.setSessionActive(false);
    },
    run: async (params) => {
      if (!params.isProActive) {
        return { ok: false, code: 'pro_required' };
      }
      if (inFlight) {
        return { ok: false, code: 'sync_in_progress' };
      }
      const cooldownRemainingMs = options.cooldownMs - (Date.now() - lastAttemptAt);
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

      inFlight = true;
      lastAttemptAt = Date.now();
      options.setSessionActive(true);
      try {
        return await params.push();
      } finally {
        inFlight = false;
        options.setSessionActive(false);
      }
    },
  };
}
