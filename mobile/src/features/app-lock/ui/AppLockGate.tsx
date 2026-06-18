import React, { useEffect, useSyncExternalStore } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { flushDeferredNavigation } from '@/app/navigation/deferredNavigation';
import { getPinHashNeedsReset, useAppLockStore } from '@/entities/app-lock';
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

type AppLockGateProps = {
  children: React.ReactNode;
};

export const AppLockGate = ({ children }: AppLockGateProps) => {
  const { isEnabled, isLocked, lock } = useAppLockStore();
  const pinHashNeedsReset = useSyncExternalStore(
    subscribeMigrationFlag,
    getPinHashNeedsReset,
    getPinHashNeedsReset,
  );

  useEffect(() => {
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'background' && isEnabled) {
        lock();
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);

    return () => sub.remove();
  }, [isEnabled, lock]);

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
