import { DeviceInfoModule } from 'react-native-nitro-device-info';

import type { TranscriptionChunkProfile } from './transcribeAudio';

const NORMAL_PROFILE: TranscriptionChunkProfile = {
  chunkDurationSec: 24,
  chunkOverlapSec: 3,
};

const CONSERVATIVE_PROFILE: TranscriptionChunkProfile = {
  chunkDurationSec: 18,
  chunkOverlapSec: 3,
};

export function resolveTranscriptionChunkProfile(): TranscriptionChunkProfile {
  try {
    const powerState = DeviceInfoModule.getPowerState();
    if (powerState.lowPowerMode || DeviceInfoModule.isLowBatteryLevel(0.2)) {
      return CONSERVATIVE_PROFILE;
    }
  } catch {
    // Device info is best-effort; fall back to the normal profile.
  }

  return NORMAL_PROFILE;
}
