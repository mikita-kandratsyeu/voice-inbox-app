import type { PushFileSnapshotResult } from '@/features/git-remote-sync/lib/pushFileSnapshot';
import { createRemoteSyncNowController } from '@/features/git-remote-sync/lib/runRemoteSyncNow';

import { ICLOUD_SYNC_COOLDOWN_MS } from './constants';
import { setIcloudSyncSessionActive } from './icloudSyncSession';

export type IcloudSyncNowResult =
  | PushFileSnapshotResult
  | { ok: false; code: 'sync_in_progress' }
  | { ok: false; code: 'sync_cooldown'; retryAfterSec: number };

const icloudSyncNowController = createRemoteSyncNowController({
  cooldownMs: ICLOUD_SYNC_COOLDOWN_MS,
  setSessionActive: setIcloudSyncSessionActive,
});

export function resetIcloudSyncNowStateForTests(): void {
  icloudSyncNowController.resetForTests();
}

export function isIcloudSyncNowInFlight(): boolean {
  return icloudSyncNowController.isInFlight();
}

export async function runIcloudSyncNow(params: {
  isProActive: boolean;
  isConnected: boolean;
  push: () => Promise<PushFileSnapshotResult>;
}): Promise<IcloudSyncNowResult> {
  const result = await icloudSyncNowController.run({
    isProActive: params.isProActive,
    isConnected: params.isConnected,
    push: async () => {
      const pushResult = await params.push();
      if (pushResult.ok) {
        return {
          ok: true as const,
          commitSha: pushResult.versionId,
          alreadyUpToDate: pushResult.alreadyUpToDate,
        };
      }
      return pushResult;
    },
  });
  if (!result.ok && result.code === 'pro_required') {
    return result;
  }
  if (!result.ok && (result.code === 'sync_in_progress' || result.code === 'sync_cooldown')) {
    return result;
  }
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    versionId: result.commitSha,
    alreadyUpToDate: result.alreadyUpToDate,
  };
}
