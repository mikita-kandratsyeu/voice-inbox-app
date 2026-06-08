import { DeviceInfoModule } from 'react-native-nitro-device-info';

import { diagWarn } from '@/shared/lib/appLogger';
import { getDeviceModelLabel } from '@/shared/lib/device-model-for-api';
import { getPlatformVersionString } from '@/shared/lib/platform';
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
      osVersion = getPlatformVersionString();
    }
  } catch {
    diagWarn('[getPushRegistrationMetadata] Failed to get push registration metadata');
  }

  return { deviceModel, appVersion, buildNumber, osVersion };
}
