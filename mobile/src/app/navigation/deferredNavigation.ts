import { useAppLockStore } from '@/entities/app-lock';

import { navigationRef } from './navigationRef';

type NavigationAction = () => void;

let pendingAction: NavigationAction | null = null;

function isAppLockBlockingNavigation(): boolean {
  const { isEnabled, isLocked } = useAppLockStore.getState();
  return isEnabled && isLocked;
}

export function runNavigationWhenUnlocked(action: NavigationAction): void {
  if (isAppLockBlockingNavigation() || !navigationRef.isReady()) {
    pendingAction = action;
    return;
  }

  action();
}

export function flushDeferredNavigation(): void {
  if (!pendingAction || isAppLockBlockingNavigation() || !navigationRef.isReady()) {
    return;
  }

  const action = pendingAction;
  pendingAction = null;
  action();
}

/** Test-only reset. */
export function resetDeferredNavigationForTests(): void {
  pendingAction = null;
}
