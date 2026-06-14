import * as Keychain from 'react-native-keychain';
import { DeviceInfoModule } from 'react-native-nitro-device-info';
import QuickCrypto from 'react-native-quick-crypto';

import { diagWarn } from '@/shared/lib/appLogger';
import { storage } from '@/shared/lib/async-storage/mmkv';

const SERVICE_DEVICE_ID = 'voice-inbox-device-id';
const MMKV_KEY = 'device-id';

let cachedDeviceId: string | null = null;

/**
 * Device ID for RevenueCat subscriptions and server identification.
 *
 * Uses system identifiers that persist across app reinstalls:
 * - iOS: identifierForVendor (IDFV) - resets only if ALL vendor apps deleted
 * - Android: ANDROID_ID - resets only on factory reset
 *
 * Fallback to generated UUID if system ID unavailable.
 *
 * Storage priority:
 * 1. Memory cache (fast)
 * 2. MMKV (fast persistent)
 * 3. Keychain (secure backup)
 * 4. System ID (survives reinstall)
 * 5. Generate UUID (last resort)
 */
export async function getOrCreateDeviceId(): Promise<string> {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  // 1. Try MMKV (fast path)
  const mmkvId = storage.getString(MMKV_KEY);
  if (mmkvId && mmkvId.trim()) {
    cachedDeviceId = mmkvId;
    return mmkvId;
  }

  // 2. Try Keychain (secure storage)
  try {
    const creds = await Keychain.getGenericPassword({ service: SERVICE_DEVICE_ID });
    if (creds !== false && creds.password) {
      const storedId = creds.password;
      cachedDeviceId = storedId;
      storage.set(MMKV_KEY, storedId); // Sync to MMKV for fast access
      return storedId;
    }
  } catch {
    diagWarn('[Device ID] Keychain read error');
  }

  // 3. Use system ID (survives reinstall)
  try {
    const systemId = DeviceInfoModule.uniqueId?.trim();

    if (systemId && systemId !== 'unknown' && systemId.length > 0) {
      // Validate it's a reasonable ID
      if (systemId.length >= 8) {
        await saveDeviceId(systemId);
        cachedDeviceId = systemId;
        return systemId;
      }
    }
  } catch (error) {
    diagWarn('[Device ID] System ID failed:', error);
  }

  // 4. Generate new UUID (last resort)
  const newId = QuickCrypto.randomUUID();
  await saveDeviceId(newId);
  cachedDeviceId = newId;
  return newId;
}

async function saveDeviceId(id: string): Promise<void> {
  // Save to both storages for redundancy
  storage.set(MMKV_KEY, id);

  try {
    await Keychain.setGenericPassword('device-id', id, {
      service: SERVICE_DEVICE_ID,
    });
  } catch {
    diagWarn('[Device ID] Keychain write error');
  }
}
