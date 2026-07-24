import { useCallback, useEffect, useState } from 'react';

import { useFolderStore } from '@/entities/folder';
import { useRecordStore } from '@/entities/record';
import { useProEntitlement } from '@/features/pro-license';

import type { IcloudSyncVersionSummary } from '../lib/fetchIcloudSyncHistory';
import { fetchIcloudSyncHistory } from '../lib/fetchIcloudSyncHistory';
import { isIcloudAvailable } from '../lib/icloudNative';
import { runIcloudSyncNow } from '../lib/icloudSyncNow';
import { beginIcloudSyncProgress, endIcloudSyncProgress } from '../lib/icloudSyncProgress';
import { isIcloudSyncSessionActive, subscribeIcloudSyncSession } from '../lib/icloudSyncSession';
import {
  disableIcloudSync,
  getIcloudSyncAutoEnabled,
  getIcloudSyncAutoIntervalHours,
  getIcloudSyncEnabled,
  getIcloudSyncLastSyncedAt,
  type IcloudSyncAutoIntervalHours,
  setIcloudSyncAutoEnabled,
  setIcloudSyncAutoIntervalHours,
  setIcloudSyncEnabled,
} from '../lib/icloudSyncState';
import { pushIcloudSnapshot } from '../lib/pushIcloudSnapshot';
import {
  type RestoreIcloudSyncResult,
  restoreIcloudSyncVersion,
} from '../lib/restoreIcloudSyncVersion';

export function useIcloudSync() {
  const { isProActive } = useProEntitlement();
  const records = useRecordStore((s) => s.records);
  const folders = useFolderStore((s) => s.folders);

  const [enabled, setEnabled] = useState(getIcloudSyncEnabled());
  const [isSyncing, setIsSyncing] = useState(isIcloudSyncSessionActive());
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(getIcloudSyncLastSyncedAt());
  const [autoSyncEnabled, setAutoSyncEnabledState] = useState(getIcloudSyncAutoEnabled());
  const [autoSyncIntervalHours, setAutoSyncIntervalHoursState] = useState(
    getIcloudSyncAutoIntervalHours(),
  );
  const [history, setHistory] = useState<IcloudSyncVersionSummary[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => subscribeIcloudSyncSession(setIsSyncing), []);

  const refreshState = useCallback(() => {
    setEnabled(getIcloudSyncEnabled());
    setLastSyncedAt(getIcloudSyncLastSyncedAt());
    setAutoSyncEnabledState(getIcloudSyncAutoEnabled());
    setAutoSyncIntervalHoursState(getIcloudSyncAutoIntervalHours());
  }, []);

  const enableSync = useCallback(async () => {
    const available = await isIcloudAvailable();
    if (!available) {
      return { ok: false as const, code: 'icloud_unavailable' as const };
    }
    setIcloudSyncEnabled(true);
    setEnabled(true);
    return { ok: true as const };
  }, []);

  const disconnect = useCallback(() => {
    disableIcloudSync();
    setEnabled(false);
    setLastSyncedAt(null);
    setAutoSyncEnabledState(false);
  }, []);

  const syncNow = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!isProActive) {
        return { ok: false as const, code: 'pro_required' as const };
      }
      if (!enabled) {
        return { ok: false as const, code: 'not_connected' as const };
      }

      const silent = options?.silent === true;
      if (!silent) {
        beginIcloudSyncProgress(true);
      }

      try {
        const result = await runIcloudSyncNow({
          isProActive: true,
          isConnected: true,
          push: async () =>
            pushIcloudSnapshot({
              records,
              folders,
              reportProgress: !silent,
            }),
        });
        if (result.ok) {
          setLastSyncedAt(getIcloudSyncLastSyncedAt());
        }
        return result;
      } finally {
        if (!silent) {
          endIcloudSyncProgress();
        }
      }
    },
    [enabled, folders, isProActive, records],
  );

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const items = await fetchIcloudSyncHistory();
      setHistory(items);
      return { ok: true as const, items };
    } catch {
      return { ok: false as const, code: 'failed' as const };
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const restoreVersion = useCallback(
    async (versionId: string): Promise<RestoreIcloudSyncResult> => {
      return restoreIcloudSyncVersion({ versionId });
    },
    [],
  );

  const setAutoSyncEnabled = useCallback((value: boolean) => {
    setIcloudSyncAutoEnabled(value);
    setAutoSyncEnabledState(value);
  }, []);

  const setAutoSyncIntervalHours = useCallback((hours: IcloudSyncAutoIntervalHours) => {
    setIcloudSyncAutoIntervalHours(hours);
    setAutoSyncIntervalHoursState(hours);
  }, []);

  return {
    isProActive,
    enabled,
    isSyncing,
    lastSyncedAt,
    autoSyncEnabled,
    autoSyncIntervalHours,
    history,
    isLoadingHistory,
    refreshState,
    enableSync,
    disconnect,
    syncNow,
    loadHistory,
    restoreVersion,
    setAutoSyncEnabled,
    setAutoSyncIntervalHours,
  };
}
