import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { flushDeferredNavigation } from '@/app/navigation/deferredNavigation';
import {
  APP_LOCK_LAST_UNLOCKED_AT_STORAGE_KEY,
  getPinHashNeedsReset,
  shouldRequireAppLock,
  useAppLockStore,
} from '@/entities/app-lock';
import { storage } from '@/shared/lib/async-storage';

import { LockScreen } from './LockScreen';
import { PinHashMigrationScreen } from './PinHashMigrationScreen';

const PIN_MIGRATION_KEY = 'app-lock.pin-hash-needs-reset';

function subscribeMigrationFlag(cb: () => void) {
  const sub = storage.addOnValueChangedListener((key) => {
    if (key === PIN_MIGRATION_KEY) cb();
  });
  return () => sub.remove();
}

function getLastUnlockedAtMs(): number {
  return storage.getNumber(APP_LOCK_LAST_UNLOCKED_AT_STORAGE_KEY) ?? 0;
}

type AppLockGateProps = {
  children: React.ReactNode;
};

export const AppLockGate = ({ children }: AppLockGateProps) => {
  const { isEnabled, isLocked, lock, lockGracePeriodMs } = useAppLockStore();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const pinHashNeedsReset = useSyncExternalStore(
    subscribeMigrationFlag,
    getPinHashNeedsReset,
    getPinHashNeedsReset,
  );

  useEffect(() => {
    const handleAppStateChange = (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      if (!isEnabled) {
        return;
      }

      if (next === 'background') {
        if (lockGracePeriodMs === 0) {
          lock();
        }
        return;
      }

      if (next === 'active' && prev === 'background') {
        if (
          shouldRequireAppLock({
            nowMs: Date.now(),
            gracePeriodMs: lockGracePeriodMs,
            lastUnlockedAtMs: getLastUnlockedAtMs(),
          })
        ) {
          lock();
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);

    return () => sub.remove();
  }, [isEnabled, lock, lockGracePeriodMs]);

  useEffect(() => {
    if (isEnabled && !isLocked) {
      flushDeferredNavigation();
    }
  }, [isEnabled, isLocked]);

  if (isEnabled && pinHashNeedsReset) {
    return <PinHashMigrationScreen />;
  }

  if (isEnabled && isLocked) {
    return <LockScreen />;
  }

  return <>{children}</>;
};
