import { Platform } from 'react-native';
import { DeviceInfoModule } from 'react-native-nitro-device-info';

/**
 * Device performance tier based on chipset capabilities
 */
export type DevicePerformanceTier = 'high' | 'medium' | 'low';

/**
 * Performance metrics used for adaptive transcription settings
 */
export type DevicePerformanceProfile = {
  tier: DevicePerformanceTier;
  optimalChunkDurationSec: number;
  optimalChunkOverlapSec: number;
  checkpointIntervalMs: number;
  contextRecycleChunks: number;
};

/**
 * Maps known iOS chip generations to performance tiers
 */
const IOS_CHIP_PERFORMANCE: Record<string, DevicePerformanceTier> = {
  // A17+ (iPhone 15 Pro+, iPad Pro M4)
  'Apple A17': 'high',
  'Apple A18': 'high',
  'Apple M1': 'high',
  'Apple M2': 'high',
  'Apple M3': 'high',
  'Apple M4': 'high',

  // A14-A16 (iPhone 12-15, iPad Air 5+)
  'Apple A14': 'medium',
  'Apple A15': 'medium',
  'Apple A16': 'medium',

  // A12-A13 and older (iPhone XS-11, iPad older)
  'Apple A12': 'low',
  'Apple A13': 'low',
};

/**
 * Maps Android SoC families to performance tiers
 */
const ANDROID_SOC_PERFORMANCE_PATTERNS: Array<{
  pattern: RegExp;
  tier: DevicePerformanceTier;
}> = [
  // High-end: Snapdragon 8 Gen 2+, Dimensity 9200+, Exynos 2400+
  { pattern: /snapdragon\s*8\s*(gen\s*[2-9]|elite)/i, tier: 'high' },
  { pattern: /dimensity\s*9[2-9]\d{2}/i, tier: 'high' },
  { pattern: /exynos\s*24\d{2}/i, tier: 'high' },
  { pattern: /google\s*tensor\s*g[3-9]/i, tier: 'high' },

  // Medium: Snapdragon 8 Gen 1, 888, 870, Dimensity 8xxx, 9000
  { pattern: /snapdragon\s*(8\s*gen\s*1|888|870|865)/i, tier: 'medium' },
  { pattern: /dimensity\s*(8\d{3}|9000|9200)/i, tier: 'medium' },
  { pattern: /exynos\s*22\d{2}/i, tier: 'medium' },
  { pattern: /google\s*tensor\s*g[1-2]/i, tier: 'medium' },

  // Low: everything else (Snapdragon 7xx, 6xx, older)
  { pattern: /.*/i, tier: 'low' },
];

/**
 * Performance profiles for each tier
 */
const PERFORMANCE_PROFILES: Record<DevicePerformanceTier, DevicePerformanceProfile> = {
  high: {
    tier: 'high',
    optimalChunkDurationSec: 30, // Larger chunks for better throughput
    optimalChunkOverlapSec: 2,
    checkpointIntervalMs: 6_000, // Less frequent saves
    contextRecycleChunks: 15, // Recycle less often
  },
  medium: {
    tier: 'medium',
    optimalChunkDurationSec: 24, // Balanced
    optimalChunkOverlapSec: 3,
    checkpointIntervalMs: 4_000,
    contextRecycleChunks: 12,
  },
  low: {
    tier: 'low',
    optimalChunkDurationSec: 18, // Smaller chunks to avoid OOM
    optimalChunkOverlapSec: 3,
    checkpointIntervalMs: 3_000, // More frequent saves
    contextRecycleChunks: 8, // Recycle more often
  },
};

/**
 * Detect iOS device performance tier based on chip name
 */
function detectIosPerformanceTier(): DevicePerformanceTier {
  try {
    // DeviceInfoModule should expose chip/SoC name
    const device = DeviceInfoModule as unknown as {
      getSystemName?: () => string;
      getModel?: () => string;
      getDeviceId?: () => string;
    };

    // Try to get chip name from various possible properties
    const systemName = device.getSystemName?.() ?? '';
    const model = device.getModel?.() ?? '';

    // Check for known chip patterns
    for (const [chipName, tier] of Object.entries(IOS_CHIP_PERFORMANCE)) {
      if (systemName.includes(chipName) || model.includes(chipName)) {
        return tier;
      }
    }

    // Fallback: use iOS version as proxy
    const iosVersion = parseInt(String(Platform.Version).split('.')[0], 10);
    if (iosVersion >= 17) return 'high';
    if (iosVersion >= 15) return 'medium';
    return 'low';
  } catch {
    // Conservative fallback
    return 'medium';
  }
}

/**
 * Detect Android device performance tier based on SoC name
 */
function detectAndroidPerformanceTier(): DevicePerformanceTier {
  try {
    const device = DeviceInfoModule as unknown as {
      getSystemName?: () => string;
      getModel?: () => string;
      getDeviceId?: () => string;
      getHardware?: () => string;
    };

    const systemName = device.getSystemName?.()?.toLowerCase() ?? '';
    const model = device.getModel?.()?.toLowerCase() ?? '';
    const hardware = device.getHardware?.()?.toLowerCase() ?? '';

    const chipInfo = `${systemName} ${model} ${hardware}`;

    // Check against known SoC patterns
    for (const { pattern, tier } of ANDROID_SOC_PERFORMANCE_PATTERNS) {
      if (pattern.test(chipInfo)) {
        return tier;
      }
    }

    return 'medium';
  } catch {
    return 'medium';
  }
}

/**
 * Detect device performance tier
 */
export function detectDevicePerformanceTier(): DevicePerformanceTier {
  if (Platform.OS === 'ios') {
    return detectIosPerformanceTier();
  }

  if (Platform.OS === 'android') {
    return detectAndroidPerformanceTier();
  }

  return 'medium';
}

/**
 * Get performance profile for current device with optional power state adjustments
 */
export function getDevicePerformanceProfile(options?: {
  respectPowerMode?: boolean;
}): DevicePerformanceProfile {
  const respectPowerMode = options?.respectPowerMode ?? true;

  let tier = detectDevicePerformanceTier();

  // Downgrade tier if device is in low power mode or low battery
  if (respectPowerMode) {
    try {
      const powerState = DeviceInfoModule.getPowerState();
      const isLowBattery = DeviceInfoModule.isLowBatteryLevel(0.2);

      if (powerState.lowPowerMode || isLowBattery) {
        // Downgrade tier: high -> medium -> low
        if (tier === 'high') tier = 'medium';
        else if (tier === 'medium') tier = 'low';
      }
    } catch {
      // Power state detection failed, use detected tier as-is
    }
  }

  return PERFORMANCE_PROFILES[tier];
}

/**
 * Calculate adaptive checkpoint interval based on audio duration
 * Longer audio = less frequent checkpoints to reduce I/O overhead
 */
export function getAdaptiveCheckpointInterval(
  audioDurationMs: number,
  baseProfile: DevicePerformanceProfile,
): number {
  const { checkpointIntervalMs } = baseProfile;

  // For audio < 2 minutes: use base interval
  if (audioDurationMs < 2 * 60 * 1000) {
    return checkpointIntervalMs;
  }

  // For 2-10 minutes: increase by 50%
  if (audioDurationMs < 10 * 60 * 1000) {
    return Math.round(checkpointIntervalMs * 1.5);
  }

  // For 10-30 minutes: increase by 100%
  if (audioDurationMs < 30 * 60 * 1000) {
    return Math.round(checkpointIntervalMs * 2);
  }

  // For 30+ minutes: increase by 150% (max)
  return Math.round(checkpointIntervalMs * 2.5);
}
