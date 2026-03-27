import { DeviceInfoModule } from 'react-native-nitro-device-info';

import type { PrivateCapabilityTier } from '../model/types';

const MB = 1024 * 1024;

const FULL_MIN_RAM_MB = 7600;
const LIMITED_MIN_RAM_MB = 5600;
const FULL_MIN_FREE_DISK_MB = 6000;
const LIMITED_MIN_FREE_DISK_MB = 3500;

export type PrivateAiCapabilityDiagnostics = {
  totalRamMb: number | null;
  freeDiskMb: number | null;
  model: string | null;
  isTablet: boolean | null;
};

export type PrivateAiCapabilityResult = {
  tier: PrivateCapabilityTier;
  diagnostics: PrivateAiCapabilityDiagnostics;
};

function toMb(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return value / MB;
}

export function resolvePrivateAiCapabilityTier(): PrivateAiCapabilityResult {
  try {
    const totalRamMb = toMb(DeviceInfoModule.totalMemory);
    const freeDiskMb = toMb(DeviceInfoModule.getFreeDiskStorage());
    const model = typeof DeviceInfoModule.model === 'string' ? DeviceInfoModule.model : null;
    const isTablet =
      typeof DeviceInfoModule.isTablet === 'boolean' ? DeviceInfoModule.isTablet : null;

    if (totalRamMb == null || freeDiskMb == null) {
      return {
        tier: 'unavailable',
        diagnostics: { totalRamMb, freeDiskMb, model, isTablet },
      };
    }

    if (totalRamMb >= FULL_MIN_RAM_MB && freeDiskMb >= FULL_MIN_FREE_DISK_MB) {
      return {
        tier: 'full',
        diagnostics: { totalRamMb, freeDiskMb, model, isTablet },
      };
    }

    if (totalRamMb >= LIMITED_MIN_RAM_MB && freeDiskMb >= LIMITED_MIN_FREE_DISK_MB) {
      return {
        tier: 'limited',
        diagnostics: { totalRamMb, freeDiskMb, model, isTablet },
      };
    }

    return {
      tier: 'unavailable',
      diagnostics: { totalRamMb, freeDiskMb, model, isTablet },
    };
  } catch {
    return {
      tier: 'unavailable',
      diagnostics: {
        totalRamMb: null,
        freeDiskMb: null,
        model: null,
        isTablet: null,
      },
    };
  }
}
