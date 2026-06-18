import { useCallback, useEffect, useRef, useState } from 'react';
import { getIsPaired, useInstalled } from 'react-native-watch-connectivity';

import { useRecordStore } from '@/entities/record';
import { IS_IOS } from '@/shared/lib';

import { buildWatchSnapshot } from '../lib/buildWatchSnapshot';
import { pushWatchSnapshot } from '../lib/pushWatchSnapshot';

const DEBOUNCE_MS = 400;

export function useWatchSnapshotSync() {
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitializedRef = useRef(false);

  // Check if Watch is paired and installed
  const [isPaired, setIsPaired] = useState(false);
  const isInstalled = useInstalled();

  useEffect(() => {
    if (!IS_IOS) return;

    const checkPaired = async () => {
      try {
        const paired = await getIsPaired();
        setIsPaired(paired);
      } catch (error) {
        console.error('[WatchSnapshotSync] Failed to check Watch status:', error);
      }
    };

    checkPaired();
  }, []);

  const isEnabled = IS_IOS && isPaired && isInstalled;

  // Subscribe to record store changes
  useEffect(() => {
    if (!isEnabled) return;

    const { isLoaded } = useRecordStore.getState();
    if (!isLoaded) return;

    // Initial sync
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      syncSnapshot();
    }

    // Subscribe to changes
    const unsubscribe = useRecordStore.subscribe(() => {
      scheduleDebouncedSync();
    });

    return () => {
      unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled]);

  // Foreground sync
  useEffect(() => {
    if (!isEnabled) return;

    const interval = setInterval(() => {
      syncSnapshot();
    }, 60000); // Refresh every minute when app is active

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled]);

  const scheduleDebouncedSync = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      syncSnapshot();
    }, DEBOUNCE_MS);
  }, []);

  const syncSnapshot = useCallback(async () => {
    try {
      const { records } = useRecordStore.getState();
      const snapshot = buildWatchSnapshot(records);
      await pushWatchSnapshot(snapshot);
    } catch (error) {
      console.error('[WatchSnapshotSync] Sync failed:', error);
    }
  }, []);
}
