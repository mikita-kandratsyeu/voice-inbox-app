import * as Keychain from 'react-native-keychain';

const SERVICE_DEVICE_ID = 'voice-inbox-device-id';

const generateUUID = (): string => {
  const hex = '0123456789abcdef';
  let str = '';

  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) str += '-';
    else if (i === 14) str += '4';
    else if (i === 19) str += hex[8 + ((Math.random() * 4) | 0)];
    else str += hex[(Math.random() * 16) | 0];
  }

  return str;
};

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
    if (__DEV__) console.warn('[Device ID] getOrCreateDeviceId: Keychain error');
  }

  const newId = generateUUID();
  const result = await Keychain.setGenericPassword('device-id', newId, {
    service: SERVICE_DEVICE_ID,
  });

  if (result !== false) {
    cachedDeviceId = newId;
    return newId;
  }

  return newId;
}
