import { DeviceInfoModule } from 'react-native-nitro-device-info';

import { isBoolean, isNumber, isString } from '@/shared/lib/type-guards';

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
  if (!isNumber(value) || !Number.isFinite(value) || value <= 0) return null;
  return value / MB;
}

export function resolvePrivateAiCapabilityTier(): PrivateAiCapabilityResult {
  try {
    const totalRamMb = toMb(DeviceInfoModule.totalMemory);
    const freeDiskMb = toMb(DeviceInfoModule.getFreeDiskStorage());
    const model = isString(DeviceInfoModule.model) ? DeviceInfoModule.model : null;
    const isTablet = isBoolean(DeviceInfoModule.isTablet) ? DeviceInfoModule.isTablet : null;

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

export function canEnablePrivateMode(tier: PrivateCapabilityTier): boolean {
  return tier !== 'unavailable';
}

export function formatPrivateDiagnosticsRamGb(
  diagnostics: PrivateAiCapabilityDiagnostics,
): string | null {
  if (diagnostics.totalRamMb == null) return null;
  const gb = diagnostics.totalRamMb / 1024;
  return gb >= 10 ? String(Math.round(gb)) : gb.toFixed(1);
}

export function formatPrivateDiagnosticsFreeDiskGb(
  diagnostics: PrivateAiCapabilityDiagnostics,
): string | null {
  if (diagnostics.freeDiskMb == null) return null;
  const gb = diagnostics.freeDiskMb / 1024;
  return gb >= 10 ? String(Math.round(gb)) : gb.toFixed(1);
}
