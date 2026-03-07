import { create } from 'zustand';

import { storage } from '@/shared/lib/mmkv';

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
import type { AppLockState, BiometryType } from './types';

const KEYS = {
  ENABLED: 'app-lock.enabled',
  USE_BIOMETRICS: 'app-lock.useBiometrics',
} as const;

const getStoredEnabled = (): boolean => storage.getBoolean(KEYS.ENABLED) ?? false;
const getStoredUseBiometrics = (): boolean => storage.getBoolean(KEYS.USE_BIOMETRICS) ?? true;

export const useAppLockStore = create<AppLockState>((set, get) => ({
  isEnabled: getStoredEnabled(),
  useBiometrics: getStoredUseBiometrics(),
  isLocked: getStoredEnabled(),
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

  verifyPin: async (pin) => verifyPinInKeychain(pin),

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

  unlock: () => set({ isLocked: false }),

  checkBiometryAvailable: async () => {
    const type = await getSupportedBiometryType();
    set({ biometryType: type as BiometryType | null });

    return type as BiometryType | null;
  },

  removePin: async () => {
    await removePinFromKeychain();
  },
}));
