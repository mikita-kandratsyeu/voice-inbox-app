import { create } from 'zustand';

import { storage } from '@/shared/lib/async-storage';

import {
  getSupportedBiometryType,
  hasBiometricFlag,
  removeBiometricFlag,
  removePinFromKeychain,
  setBiometricFlag,
  setPinInKeychain,
  verifyBiometric,
  verifyPinInKeychain,
} from '../lib/keychain';
import {
  APP_LOCK_GRACE_PERIOD_STORAGE_KEY,
  APP_LOCK_LAST_UNLOCKED_AT_STORAGE_KEY,
  normalizeAppLockGracePeriodMs,
} from '../lib/lockGracePeriod';
import {
  type AppLockGracePeriodMs,
  DEFAULT_APP_LOCK_GRACE_PERIOD_MS,
  DEFAULT_PIN_LENGTH,
} from './constants';
import type { AppLockState, BiometryType } from './types';

const KEYS = {
  ENABLED: 'app-lock.enabled',
  USE_BIOMETRICS: 'app-lock.useBiometrics',
  PIN_LENGTH: 'app-lock.pinLength',
} as const;

const getStoredEnabled = (): boolean => storage.getBoolean(KEYS.ENABLED) ?? false;
const getStoredUseBiometrics = (): boolean => storage.getBoolean(KEYS.USE_BIOMETRICS) ?? true;
const getStoredPinLength = (): number => {
  const value = storage.getNumber(KEYS.PIN_LENGTH);
  return value === 6 ? 6 : DEFAULT_PIN_LENGTH;
};
const getStoredLockGracePeriodMs = (): AppLockGracePeriodMs =>
  normalizeAppLockGracePeriodMs(storage.getNumber(APP_LOCK_GRACE_PERIOD_STORAGE_KEY));

function markUnlocked(nowMs: number = Date.now()): void {
  storage.set(APP_LOCK_LAST_UNLOCKED_AT_STORAGE_KEY, nowMs);
}

function computeInitialLockedState(): boolean {
  // Cold start always requires unlock when App Lock is on. Grace period applies only
  // when returning from background (see AppLockGate).
  return getStoredEnabled();
}

export const useAppLockStore = create<AppLockState>((set, get) => ({
  isEnabled: getStoredEnabled(),
  useBiometrics: getStoredUseBiometrics(),
  isLocked: computeInitialLockedState(),
  pinLength: getStoredPinLength(),
  lockGracePeriodMs: getStoredLockGracePeriodMs(),
  biometryType: null,

  setEnabled: async (enabled) => {
    storage.set(KEYS.ENABLED, enabled);

    if (!enabled) {
      await removePinFromKeychain();
      storage.remove(APP_LOCK_LAST_UNLOCKED_AT_STORAGE_KEY);
      set({
        isEnabled: false,
        useBiometrics: false,
        isLocked: false,
        lockGracePeriodMs: DEFAULT_APP_LOCK_GRACE_PERIOD_MS,
      });
      storage.set(APP_LOCK_GRACE_PERIOD_STORAGE_KEY, DEFAULT_APP_LOCK_GRACE_PERIOD_MS);
      storage.set(KEYS.USE_BIOMETRICS, false);
    } else {
      markUnlocked();
      set({ isEnabled: true, isLocked: false });
    }
  },

  setUseBiometrics: async (use) => {
    storage.set(KEYS.USE_BIOMETRICS, use);

    if (use) {
      const ok = await setBiometricFlag();
      set({ useBiometrics: ok });
    } else {
      await removeBiometricFlag();
      set({ useBiometrics: false });
    }
  },

  setPinLength: (length) => {
    const nextLength = length === 6 ? 6 : DEFAULT_PIN_LENGTH;
    storage.set(KEYS.PIN_LENGTH, nextLength);
    set({ pinLength: nextLength });
  },

  setLockGracePeriodMs: (value) => {
    const next = normalizeAppLockGracePeriodMs(value);
    storage.set(APP_LOCK_GRACE_PERIOD_STORAGE_KEY, next);
    set({ lockGracePeriodMs: next });
  },

  setLocked: (locked) => set({ isLocked: locked }),

  setPin: async (pin) => {
    const ok = await setPinInKeychain(pin);

    if (ok) {
      const { useBiometrics } = get();

      if (useBiometrics) {
        await setBiometricFlag();
      }
    }

    return ok;
  },

  verifyPin: async (pin) => {
    const ok = await verifyPinInKeychain(pin);
    return ok;
  },

  unlockWithBiometrics: async () => {
    const hasBio = await hasBiometricFlag();

    if (!hasBio) {
      return false;
    }

    return verifyBiometric();
  },

  lock: async () => {
    set({ isLocked: true });
  },

  unlock: () => {
    markUnlocked();
    set({ isLocked: false });
  },

  checkBiometryAvailable: async () => {
    const type = await getSupportedBiometryType();
    set({ biometryType: type as BiometryType | null });

    return type as BiometryType | null;
  },

  removePin: async () => {
    await removePinFromKeychain();
  },
}));
