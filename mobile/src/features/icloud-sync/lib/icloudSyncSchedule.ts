import { useFolderStore } from '@/entities/folder';
import { useRecordStore } from '@/entities/record';
import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';
import { diagWarn } from '@/shared/lib/appLogger';

import { runIcloudSyncNow } from './icloudSyncNow';
import { beginIcloudSyncProgress, endIcloudSyncProgress } from './icloudSyncProgress';
import { isIcloudSyncScheduleDue } from './icloudSyncSchedulePolicy';
import { getIcloudSyncEnabled, setIcloudSyncLastAutoAttemptAt } from './icloudSyncState';
import { pushIcloudSnapshot } from './pushIcloudSnapshot';

export { isIcloudSyncScheduleDue } from './icloudSyncSchedulePolicy';

export async function maybeRunScheduledIcloudSync(): Promise<void> {
  if (!isIcloudSyncScheduleDue()) {
    return;
  }

  if (!isProActiveFromStorageSync()) {
    return;
  }

  if (!getIcloudSyncEnabled()) {
    return;
  }

  setIcloudSyncLastAutoAttemptAt(Date.now());
  beginIcloudSyncProgress(false);

  try {
    const records = useRecordStore.getState().records;
    const folders = useFolderStore.getState().folders;
    await runIcloudSyncNow({
      isProActive: true,
      isConnected: true,
      push: async () =>
        pushIcloudSnapshot({
          records,
          folders,
          reportProgress: true,
        }),
    });
  } catch (err) {
    diagWarn('[icloud-sync] scheduled sync failed', err);
  } finally {
    endIcloudSyncProgress();
  }
}
