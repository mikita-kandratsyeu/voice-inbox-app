import * as Keychain from 'react-native-keychain';

import { isNumber, isRecord } from '@/shared/lib';
import { i18n } from '@/shared/lib/i18n';

import { PIN_LOCKOUT_STEPS_MS } from '../model/constants';
import { hashPin, needsPinHashMigration, verifyPinHash } from './hashPin';
import { setPinHashNeedsReset } from './pinHashMigrationStorage';

const SERVICE_PIN = 'voice-inbox-app-lock-pin';
const SERVICE_BIOMETRIC = 'voice-inbox-app-lock-biometric';
const SERVICE_PIN_RATE = 'voice-inbox-app-lock-pin-rate';

export type PinLockoutState = {
  failedAttempts: number;
  lockoutUntil: number;
};

const EMPTY_LOCKOUT: PinLockoutState = { failedAttempts: 0, lockoutUntil: 0 };

function parsePinLockoutState(raw: string): PinLockoutState {
  try {
    const j = JSON.parse(raw) as unknown;

    if (!isRecord(j) || j === null) {
      return { ...EMPTY_LOCKOUT };
    }

    const o = j as Record<string, unknown>;
    const failedAttempts =
      isNumber(o.failedAttempts) && Number.isFinite(o.failedAttempts) && o.failedAttempts >= 0
        ? Math.floor(o.failedAttempts)
        : 0;
    const lockoutUntil =
      isNumber(o.lockoutUntil) && Number.isFinite(o.lockoutUntil) && o.lockoutUntil >= 0
        ? o.lockoutUntil
        : 0;

    return { failedAttempts, lockoutUntil };
  } catch {
    return { ...EMPTY_LOCKOUT };
  }
}

async function writePinLockoutState(state: PinLockoutState): Promise<void> {
  await Keychain.setGenericPassword('rate', JSON.stringify(state), {
    service: SERVICE_PIN_RATE,
  });
}

export async function getPinLockoutState(): Promise<PinLockoutState> {
  const creds = await Keychain.getGenericPassword({ service: SERVICE_PIN_RATE });

  if (!creds) {
    return { ...EMPTY_LOCKOUT };
  }

  return parsePinLockoutState(creds.password);
}

export async function recordPinLockoutFailure(): Promise<PinLockoutState> {
  const prev = await getPinLockoutState();
  const failedAttempts = prev.failedAttempts + 1;
  const lockoutMs =
    PIN_LOCKOUT_STEPS_MS[Math.min(failedAttempts - 1, PIN_LOCKOUT_STEPS_MS.length - 1)];
  const next: PinLockoutState = {
    failedAttempts,
    lockoutUntil: Date.now() + lockoutMs,
  };

  await writePinLockoutState(next);

  return next;
}

export async function clearPinLockoutState(): Promise<void> {
  await Keychain.resetGenericPassword({ service: SERVICE_PIN_RATE });
}

export const setPinInKeychain = async (pin: string): Promise<boolean> => {
  const hashed = hashPin(pin);
  const result = await Keychain.setGenericPassword('pin', hashed, {
    service: SERVICE_PIN,
  });

  if (result !== false) {
    await clearPinLockoutState();
  }

  return result !== false;
};

export const verifyPinInKeychain = async (pin: string): Promise<boolean> => {
  const creds = await Keychain.getGenericPassword({ service: SERVICE_PIN });

  if (!creds) {
    return false;
  }

  const stored = creds.password;
  if (!verifyPinHash(stored, pin)) {
    return false;
  }

  if (needsPinHashMigration(stored)) {
    await setPinInKeychain(pin);
  }

  return true;
};

export const hasPinInKeychain = async (): Promise<boolean> =>
  Keychain.hasGenericPassword({ service: SERVICE_PIN });

export const checkAndFlagLegacyPinHash = async (): Promise<boolean> => {
  try {
    const creds = await Keychain.getGenericPassword({ service: SERVICE_PIN });

    if (!creds) {
      return false;
    }

    const needsMigration = needsPinHashMigration(creds.password);
    setPinHashNeedsReset(needsMigration);
    return needsMigration;
  } catch {
    return false;
  }
};

export const removePinFromKeychain = async (): Promise<void> => {
  await Keychain.resetGenericPassword({ service: SERVICE_PIN });
  await Keychain.resetGenericPassword({ service: SERVICE_BIOMETRIC });
  await Keychain.resetGenericPassword({ service: SERVICE_PIN_RATE });
};

export const removeBiometricFlag = async (): Promise<void> => {
  await Keychain.resetGenericPassword({ service: SERVICE_BIOMETRIC });
};

export const setBiometricFlag = async (): Promise<boolean> => {
  const result = await Keychain.setGenericPassword('bio', 'ok', {
    service: SERVICE_BIOMETRIC,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
  });

  return result !== false;
};

export const verifyBiometric = async (): Promise<boolean> => {
  try {
    const creds = await Keychain.getGenericPassword({
      service: SERVICE_BIOMETRIC,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
      authenticationPrompt: {
        title: i18n.t('appLock.biometricPromptTitle'),
        cancel: i18n.t('common.cancel'),
      },
    });

    return creds !== false && creds.password === 'ok';
  } catch {
    return false;
  }
};

export const hasBiometricFlag = async (): Promise<boolean> =>
  Keychain.hasGenericPassword({ service: SERVICE_BIOMETRIC });

export const getSupportedBiometryType = async (): Promise<string | null> => {
  const type = await Keychain.getSupportedBiometryType();

  return type;
};
