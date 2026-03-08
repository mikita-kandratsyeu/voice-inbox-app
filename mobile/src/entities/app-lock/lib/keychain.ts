import * as Keychain from 'react-native-keychain';

import { hashPin } from './hashPin';

const SERVICE_PIN = 'voice-inbox-app-lock-pin';
const SERVICE_BIOMETRIC = 'voice-inbox-app-lock-biometric';

export const setPinInKeychain = async (pin: string): Promise<boolean> => {
  const hashed = hashPin(pin);
  const result = await Keychain.setGenericPassword('pin', hashed, {
    service: SERVICE_PIN,
  });

  return result !== false;
};

export const verifyPinInKeychain = async (pin: string): Promise<boolean> => {
  const creds = await Keychain.getGenericPassword({ service: SERVICE_PIN });

  if (!creds) {
    return false;
  }

  return creds.password === hashPin(pin);
};

export const hasPinInKeychain = async (): Promise<boolean> =>
  Keychain.hasGenericPassword({ service: SERVICE_PIN });

export const removePinFromKeychain = async (): Promise<void> => {
  await Keychain.resetGenericPassword({ service: SERVICE_PIN });
  await Keychain.resetGenericPassword({ service: SERVICE_BIOMETRIC });
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
        title: 'Разблокировать Voice Inbox',
        cancel: 'Отмена',
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
