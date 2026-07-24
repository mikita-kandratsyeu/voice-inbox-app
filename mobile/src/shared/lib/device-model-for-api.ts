import { DeviceInfoModule } from 'react-native-nitro-device-info';

import { diagWarn } from '@/shared/lib/appLogger';
import { IS_ANDROID } from '@/shared/lib/platform';

export function getDeviceModelLabel(): string {
  try {
    const brand = String(DeviceInfoModule.brand ?? '').trim();
    const model = String(DeviceInfoModule.model ?? '').trim();

    if (IS_ANDROID && brand && model) {
      return `${brand} ${model}`;
    }

    if (model) return model;
    if (brand) return brand;
  } catch {
    diagWarn('[getDeviceModelLabel] Failed to get device model');
  }

  return '';
}
