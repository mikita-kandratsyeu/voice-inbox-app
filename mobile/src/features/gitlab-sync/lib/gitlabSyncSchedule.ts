import { useFolderStore } from '@/entities/folder';
import { useRecordStore } from '@/entities/record';
import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';
import { diagWarn } from '@/shared/lib/appLogger';

import { getGitlabSyncSecrets, isGitlabSyncConnected } from './gitlabSecrets';
import { runGitlabSyncNow } from './gitlabSyncNow';
import { beginGitlabSyncProgress, endGitlabSyncProgress } from './gitlabSyncProgress';
import { isGitlabSyncScheduleDue } from './gitlabSyncSchedulePolicy';
import { setGitlabSyncLastAutoAttemptAt } from './gitlabSyncState';
import { pushGitlabCommit } from './pushGitlabCommit';

export { isGitlabSyncScheduleDue } from './gitlabSyncSchedulePolicy';

export async function maybeRunScheduledGitlabSync(): Promise<void> {
  if (!isGitlabSyncScheduleDue()) {
    return;
  }

  if (!isProActiveFromStorageSync()) {
    return;
  }

  const connected = await isGitlabSyncConnected();
  if (!connected) {
    return;
  }

  const secrets = await getGitlabSyncSecrets();
  if (!secrets) {
    return;
  }

  setGitlabSyncLastAutoAttemptAt(Date.now());
  beginGitlabSyncProgress(false);

  try {
    const records = useRecordStore.getState().records;
    const folders = useFolderStore.getState().folders;
    await runGitlabSyncNow({
      isProActive: true,
      isConnected: true,
      push: async () =>
        pushGitlabCommit({
          secrets,
          records,
          folders,
          reportProgress: true,
        }),
    });
  } catch (err) {
    diagWarn('[gitlab-sync] scheduled sync failed', err);
  } finally {
    endGitlabSyncProgress();
  }
}
