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
import { DEFAULT_PIN_LENGTH } from './constants';
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

export const useAppLockStore = create<AppLockState>((set, get) => ({
  isEnabled: getStoredEnabled(),
  useBiometrics: getStoredUseBiometrics(),
  isLocked: getStoredEnabled(),
  pinLength: getStoredPinLength(),
  biometryType: null,

  setEnabled: async (enabled) => {
    storage.set(KEYS.ENABLED, enabled);

    if (!enabled) {
      await removePinFromKeychain();
      set({ isEnabled: false, useBiometrics: false, isLocked: false });
      storage.set(KEYS.USE_BIOMETRICS, false);
    } else {
      set({ isEnabled: true });
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
