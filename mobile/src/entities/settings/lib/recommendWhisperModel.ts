import { DeviceInfoModule } from 'react-native-nitro-device-info';

import { IS_ANDROID } from '@/shared/lib';
import { readTotalRamMb } from '@/shared/lib/deviceMemoryTier';

import type { WhisperModelId, WhisperModelWeightsFormat } from '../model/types';

export function getRecommendedWhisperModelId(
  format: WhisperModelWeightsFormat = 'q5_1',
): WhisperModelId {
  try {
    if (IS_ANDROID && DeviceInfoModule.isLowRamDevice) {
      return 'whisper-tiny';
    }

    const totalRamMB = readTotalRamMb();
    if (totalRamMB == null) {
      return 'whisper-base';
    }

    if (format === 'full') {
      if (totalRamMB < 3200) {
        return 'whisper-tiny';
      }

      if (totalRamMB < 5200) {
        return 'whisper-base';
      }

      return 'whisper-small';
    }

    if (totalRamMB < 2600) return 'whisper-tiny';
    if (totalRamMB < 4200) return 'whisper-base';

    return 'whisper-small';
  } catch {
    return 'whisper-base';
  }
}
