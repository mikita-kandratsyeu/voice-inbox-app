import { DeviceInfoModule } from 'react-native-nitro-device-info';

import { i18n, IS_ANDROID } from '@/shared/lib';
import { diagWarn } from '@/shared/lib/appLogger';

import type { WhisperModelId, WhisperModelWeightsFormat } from '../model/types';

const MODEL_MIN_RAM_MB: Record<WhisperModelId, number> = {
  'whisper-tiny': 1200,
  'whisper-base': 1500,
  'whisper-small': 3200,
  'whisper-medium': 6000,
  'whisper-large-v3-turbo': 8000,
};

const MODEL_MIN_YEAR_CLASS: Record<WhisperModelId, number> = {
  'whisper-tiny': 2013,
  'whisper-base': 2015,
  'whisper-small': 2017,
  'whisper-medium': 2019,
  'whisper-large-v3-turbo': 2020,
};

const MODEL_MIN_FREE_DISK_MB: Record<WhisperModelWeightsFormat, Record<WhisperModelId, number>> = {
  q5_1: {
    'whisper-tiny': 200,
    'whisper-base': 300,
    'whisper-small': 600,
    'whisper-medium': 2500,
    'whisper-large-v3-turbo': 2500,
  },
  full: {
    'whisper-tiny': 300,
    'whisper-base': 450,
    'whisper-small': 1100,
    'whisper-medium': 2500,
    'whisper-large-v3-turbo': 2500,
  },
};

const HEAVY_MODELS: WhisperModelId[] = ['whisper-small', 'whisper-medium', 'whisper-large-v3-turbo'];

export type DeviceCompatibilityResult = {
  isCompatible: boolean;
  reason?: string;
};

export const canDeviceRunWhisperModel = async (
  modelId: WhisperModelId,
  format: WhisperModelWeightsFormat = 'q5_1',
): Promise<DeviceCompatibilityResult> => {
  try {
    const totalRamBytes = DeviceInfoModule.totalMemory;
    const freeDiskBytes = DeviceInfoModule.getFreeDiskStorage();

    const totalRamMB = totalRamBytes / (1024 * 1024);
    const freeDiskMB = freeDiskBytes / (1024 * 1024);

    const minRam = MODEL_MIN_RAM_MB[modelId];
    const minDisk = MODEL_MIN_FREE_DISK_MB[format][modelId];
    const minYearClass = MODEL_MIN_YEAR_CLASS[modelId];

    const formatMb = (mb: number) =>
      mb >= 1024
        ? i18n.t('device.gb', { value: Math.round(mb / 1024) })
        : i18n.t('device.mb', { value: Math.round(mb) });

    if (IS_ANDROID && DeviceInfoModule.isLowRamDevice && HEAVY_MODELS.includes(modelId)) {
      return {
        isCompatible: false,
        reason: i18n.t('device.lowRamDevice'),
      };
    }

    const yearClass = DeviceInfoModule.deviceYearClass;
    if (yearClass >= 0 && yearClass < minYearClass) {
      return {
        isCompatible: false,
        reason: i18n.t('device.insufficientRam', {
          required: formatMb(minRam),
          available: formatMb(totalRamMB),
        }),
      };
    }

    if (totalRamMB < minRam) {
      return {
        isCompatible: false,
        reason: i18n.t('device.insufficientRam', {
          required: formatMb(minRam),
          available: formatMb(totalRamMB),
        }),
      };
    }

    if (freeDiskMB < minDisk) {
      return {
        isCompatible: false,
        reason: i18n.t('device.lowDiskSpace', {
          required: formatMb(minDisk),
          available: formatMb(freeDiskMB),
        }),
      };
    }

    return { isCompatible: true };
  } catch (error) {
    diagWarn('[canDeviceRunWhisperModel] Failed to check compatibility:', error);

    return {
      isCompatible: true,
      reason: undefined,
    };
  }
};

export const checkAllModelsCompatibility = async (): Promise<
  Record<WhisperModelId, DeviceCompatibilityResult>
> => {
  return checkAllModelsCompatibilityByFormat('q5_1');
};

export const checkAllModelsCompatibilityByFormat = async (
  format: WhisperModelWeightsFormat,
): Promise<Record<WhisperModelId, DeviceCompatibilityResult>> => {
  const modelIds: WhisperModelId[] = [
    'whisper-tiny',
    'whisper-base',
    'whisper-small',
    'whisper-medium',
    'whisper-large-v3-turbo',
  ];

  const results = await Promise.all(
    modelIds.map(async (id) => ({ id, result: await canDeviceRunWhisperModel(id, format) })),
  );

  return Object.fromEntries(results.map(({ id, result }) => [id, result])) as Record<
    WhisperModelId,
    DeviceCompatibilityResult
  >;
};
