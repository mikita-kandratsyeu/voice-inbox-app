import { useEffect } from 'react';

import { useSettingsStore } from '@/entities/settings/model/store';

import { settingsSnapshotForCrashlytics } from './buildCrashlyticsAttributes';
import { syncCrashlyticsContext } from './index';

export function useCrashlyticsContextSync(): void {
  useEffect(() => {
    let prevSnapshot = JSON.stringify(settingsSnapshotForCrashlytics(useSettingsStore.getState()));

    const unsub = useSettingsStore.subscribe((state) => {
      const nextSnapshot = JSON.stringify(settingsSnapshotForCrashlytics(state));
      if (nextSnapshot === prevSnapshot) {
        return;
      }

      prevSnapshot = nextSnapshot;
      void syncCrashlyticsContext();
    });

    return unsub;
  }, []);
}
