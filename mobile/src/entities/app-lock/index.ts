export type { PinLockoutState } from './lib/keychain';
export {
  checkAndFlagLegacyPinHash,
  clearPinLockoutState,
  getPinLockoutState,
  recordPinLockoutFailure,
} from './lib/keychain';
export {
  APP_LOCK_GRACE_PERIOD_STORAGE_KEY,
  APP_LOCK_LAST_UNLOCKED_AT_STORAGE_KEY,
  normalizeAppLockGracePeriodMs,
  shouldRequireAppLock,
} from './lib/lockGracePeriod';
export { getPinHashNeedsReset, setPinHashNeedsReset } from './lib/pinHashMigrationStorage';
export type { AppLockGracePeriodMs, PinLengthOption } from './model/constants';
export {
  APP_LOCK_GRACE_PERIOD_OPTIONS,
  BIOMETRY_LABELS,
  DEFAULT_APP_LOCK_GRACE_PERIOD_MS,
  DEFAULT_PIN_LENGTH,
  PIN_LENGTH_OPTIONS,
} from './model/constants';
export { useAppLockStore } from './model/store';
export type { AppLockState, BiometryType } from './model/types';
