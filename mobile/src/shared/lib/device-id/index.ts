import * as Keychain from 'react-native-keychain';
import QuickCrypto from 'react-native-quick-crypto';

import { diagWarn } from '@/shared/lib/appLogger';

const SERVICE_DEVICE_ID = 'voice-inbox-device-id';

let cachedDeviceId: string | null = null;

export async function getOrCreateDeviceId(): Promise<string> {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  try {
    const creds = await Keychain.getGenericPassword({ service: SERVICE_DEVICE_ID });

    if (creds !== false && creds.password) {
      const storedId = creds.password;
      cachedDeviceId = storedId;
      return storedId;
    }
  } catch {
    diagWarn('[Device ID] getOrCreateDeviceId: Keychain error');
  }

  const newId = QuickCrypto.randomUUID();
  const result = await Keychain.setGenericPassword('device-id', newId, {
    service: SERVICE_DEVICE_ID,
  });

  if (result !== false) {
    cachedDeviceId = newId;
    return newId;
  }

  return newId;
}
