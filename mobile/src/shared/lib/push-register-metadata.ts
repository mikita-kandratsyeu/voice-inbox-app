import { Platform } from 'react-native';
import { DeviceInfoModule } from 'react-native-nitro-device-info';

import { getDeviceModelLabel } from '@/shared/lib/device-model-for-api';
import { isNumber, isString } from '@/shared/lib/type-guards';

export type PushRegistrationMetadata = {
  deviceModel: string;
  appVersion: string;
  buildNumber: string;
  osVersion: string;
};

export function getPushRegistrationMetadata(): PushRegistrationMetadata {
  const deviceModel = getDeviceModelLabel();
  let appVersion = '';
  let buildNumber = '';
  let osVersion = '';

  try {
    appVersion = String(DeviceInfoModule.version ?? '').trim();
    const buildRaw =
      'buildNumber' in DeviceInfoModule
        ? (DeviceInfoModule as { buildNumber?: string | number }).buildNumber
        : undefined;
    buildNumber = isString(buildRaw) || isNumber(buildRaw) ? String(buildRaw).trim() : '';
    const systemName = String(DeviceInfoModule.systemName ?? '').trim();
    const systemVersion = String(DeviceInfoModule.systemVersion ?? '').trim();
    osVersion = [systemName, systemVersion].filter(Boolean).join(' ');

    if (!osVersion) {
      osVersion = String(Platform.Version ?? '').trim();
    }
  } catch {
    if (__DEV__) {
      console.warn('[getPushRegistrationMetadata] Failed to get push registration metadata');
    }
  }

  return { deviceModel, appVersion, buildNumber, osVersion };
}
