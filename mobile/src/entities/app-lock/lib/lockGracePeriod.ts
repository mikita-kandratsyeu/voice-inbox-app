import {
  APP_LOCK_GRACE_PERIOD_OPTIONS,
  type AppLockGracePeriodMs,
  DEFAULT_APP_LOCK_GRACE_PERIOD_MS,
} from '../model/constants';

export const APP_LOCK_GRACE_PERIOD_STORAGE_KEY = 'app-lock.lock-grace-period-ms';
export const APP_LOCK_LAST_UNLOCKED_AT_STORAGE_KEY = 'app-lock.last-unlocked-at';

export function normalizeAppLockGracePeriodMs(value: number | undefined): AppLockGracePeriodMs {
  if (value != null && (APP_LOCK_GRACE_PERIOD_OPTIONS as readonly number[]).includes(value)) {
    return value as AppLockGracePeriodMs;
  }

  return DEFAULT_APP_LOCK_GRACE_PERIOD_MS;
}

export function shouldRequireAppLock(input: {
  nowMs: number;
  gracePeriodMs: AppLockGracePeriodMs;
  lastUnlockedAtMs: number;
}): boolean {
  // Used when returning from background only — not on cold start.
  const { nowMs, gracePeriodMs, lastUnlockedAtMs } = input;

  if (gracePeriodMs === 0) {
    return true;
  }

  if (lastUnlockedAtMs <= 0) {
    return true;
  }

  return nowMs - lastUnlockedAtMs >= gracePeriodMs;
}
