import { DeviceInfoModule } from 'react-native-nitro-device-info';

import { IS_ANDROID } from './platform';
import { isNumber } from './type-guards';

const MB = 1024 * 1024;

/** Breakpoints aligned with Whisper model recommendation (q5_1) and private on-device AI. */
const TIER_MEDIUM_MIN_RAM_MB = 2600;
const TIER_HIGH_MIN_RAM_MB = 4200;
const TIER_ULTRA_MIN_RAM_MB = 7600;

export type DeviceMemoryTier = 'low' | 'medium' | 'high' | 'ultra';

export function readTotalRamMb(): number | null {
  try {
    const value = DeviceInfoModule.totalMemory;
    if (!isNumber(value) || !Number.isFinite(value) || value <= 0) return null;
    return value / MB;
  } catch {
    return null;
  }
}

/**
 * Classifies device RAM into export / workload tiers.
 * Uses `DeviceInfoModule.totalMemory` and Android `isLowRamDevice` (same source as Whisper).
 */
export function resolveDeviceMemoryTier(): DeviceMemoryTier {
  try {
    if (IS_ANDROID && DeviceInfoModule.isLowRamDevice) {
      return 'low';
    }

    const totalRamMb = readTotalRamMb();
    if (totalRamMb == null) {
      return 'medium';
    }

    if (totalRamMb >= TIER_ULTRA_MIN_RAM_MB) return 'ultra';
    if (totalRamMb >= TIER_HIGH_MIN_RAM_MB) return 'high';
    if (totalRamMb >= TIER_MEDIUM_MIN_RAM_MB) return 'medium';

    return 'low';
  } catch {
    return 'medium';
  }
}
