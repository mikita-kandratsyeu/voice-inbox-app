import React, { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAppLockStore } from '@/entities/app-lock';

import { LockScreen } from './LockScreen';

type AppLockGateProps = {
  children: React.ReactNode;
};

export const AppLockGate = ({ children }: AppLockGateProps) => {
  const { isEnabled, isLocked, lock } = useAppLockStore();

  useEffect(() => {
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'background' && isEnabled) {
        lock();
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);

    return () => sub.remove();
  }, [isEnabled, lock]);

  if (isEnabled && isLocked) {
    return <LockScreen />;
  }

  return <>{children}</>;
};
