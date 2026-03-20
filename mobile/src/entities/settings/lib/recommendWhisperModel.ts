import { DeviceInfoModule } from 'react-native-nitro-device-info';

import { IS_ANDROID } from '@/shared/lib';

import type { WhisperModelId } from '../model/types';

export function getRecommendedWhisperModelId(): WhisperModelId {
  try {
    const totalRamMB = DeviceInfoModule.totalMemory / (1024 * 1024);

    if (IS_ANDROID && DeviceInfoModule.isLowRamDevice) {
      return 'whisper-tiny';
    }

    if (totalRamMB < 2600) {
      return 'whisper-tiny';
    }

    if (totalRamMB < 4200) {
      return 'whisper-base';
    }

    return 'whisper-small';
  } catch {
    return 'whisper-base';
  }
}
