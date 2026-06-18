import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { getIsPaired, useInstalled, watchEvents } from 'react-native-watch-connectivity';

import { useRecordStore } from '@/entities/record';
import { IS_IOS } from '@/shared/lib';

import { buildWatchSnapshot } from '../lib/buildWatchSnapshot';
import { pushWatchSnapshot } from '../lib/pushWatchSnapshot';

const DEBOUNCE_MS = 400;
const FOREGROUND_REFRESH_MS = 30_000;

export function useWatchSnapshotSync() {
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitializedRef = useRef(false);
  const storeUnsubRef = useRef<(() => void) | null>(null);

  const isInstalled = useInstalled();
  const [isPaired, setIsPaired] = useState(false);
  const isEnabled = IS_IOS && isPaired && isInstalled;

  const refreshPaired = useCallback(async () => {
    if (!IS_IOS) return;
    try {
      setIsPaired(await getIsPaired());
    } catch (error) {
      console.error('[WatchSnapshotSync] Failed to check Watch status:', error);
      setIsPaired(false);
    }
  }, []);

  const syncSnapshot = useCallback(async () => {
    if (!IS_IOS || !useRecordStore.getState().isLoaded) return;

    try {
      const { records } = useRecordStore.getState();
      const snapshot = buildWatchSnapshot(records);
      await pushWatchSnapshot(snapshot);
    } catch (error) {
      console.error('[WatchSnapshotSync] Sync failed:', error);
    }
  }, []);

  const scheduleDebouncedSync = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void syncSnapshot();
    }, DEBOUNCE_MS);
  }, [syncSnapshot]);

  const attachStoreSubscription = useCallback(() => {
    if (storeUnsubRef.current) return;

    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      void syncSnapshot();
    }

    storeUnsubRef.current = useRecordStore.subscribe(() => {
      scheduleDebouncedSync();
    });
  }, [scheduleDebouncedSync, syncSnapshot]);

  useEffect(() => {
    if (!IS_IOS) return;

    void refreshPaired();

    const pairedUnsub = watchEvents.on('paired', () => {
      void refreshPaired();
    });

    const installedUnsub = watchEvents.on('installed', () => {
      void refreshPaired();
    });

    return () => {
      pairedUnsub();
      installedUnsub();
    };
  }, [refreshPaired]);

  useEffect(() => {
    if (!isEnabled) return;

    const ensureSubscription = () => {
      if (useRecordStore.getState().isLoaded) {
        attachStoreSubscription();
      }
    };

    ensureSubscription();

    const waitForLoaded = useRecordStore.subscribe((state) => {
      if (state.isLoaded) {
        attachStoreSubscription();
      }
    });

    return () => {
      waitForLoaded();
      storeUnsubRef.current?.();
      storeUnsubRef.current = null;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [attachStoreSubscription, isEnabled]);

  useEffect(() => {
    if (!isEnabled) return;

    void syncSnapshot();
  }, [isEnabled, syncSnapshot]);

  useEffect(() => {
    if (!isEnabled) return;

    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        void syncSnapshot();
      }
    };

    handleAppStateChange(AppState.currentState);
    const sub = AppState.addEventListener('change', handleAppStateChange);
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        void syncSnapshot();
      }
    }, FOREGROUND_REFRESH_MS);

    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [isEnabled, syncSnapshot]);
}
