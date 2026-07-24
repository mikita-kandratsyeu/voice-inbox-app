import { useFolderStore } from '@/entities/folder';
import { useRecordStore } from '@/entities/record';
import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';
import { diagWarn } from '@/shared/lib/appLogger';

import { getGithubSyncSecrets, isGithubSyncConnected } from './githubSecrets';
import { runGithubSyncNow } from './githubSyncNow';
import { beginGithubSyncProgress, endGithubSyncProgress } from './githubSyncProgress';
import { isGithubSyncScheduleDue } from './githubSyncSchedulePolicy';
import { setGithubSyncLastAutoAttemptAt } from './githubSyncState';
import { pushGithubCommit } from './pushGithubCommit';

export { isGithubSyncScheduleDue } from './githubSyncSchedulePolicy';

export async function maybeRunScheduledGithubSync(): Promise<void> {
  if (!isGithubSyncScheduleDue()) {
    return;
  }

  if (!isProActiveFromStorageSync()) {
    return;
  }

  const connected = await isGithubSyncConnected();
  if (!connected) {
    return;
  }

  const secrets = await getGithubSyncSecrets();
  if (!secrets) {
    return;
  }

  setGithubSyncLastAutoAttemptAt(Date.now());
  beginGithubSyncProgress(false);

  try {
    const records = useRecordStore.getState().records;
    const folders = useFolderStore.getState().folders;
    await runGithubSyncNow({
      isProActive: true,
      isConnected: true,
      push: async () =>
        pushGithubCommit({
          secrets,
          records,
          folders,
          reportProgress: true,
        }),
    });
  } catch (err) {
    diagWarn('[github-sync] scheduled sync failed', err);
  } finally {
    endGithubSyncProgress();
  }
}
