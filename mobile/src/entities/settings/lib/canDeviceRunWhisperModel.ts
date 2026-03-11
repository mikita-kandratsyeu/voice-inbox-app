import DeviceInfo from 'react-native-device-info';

import { i18n } from '@/shared/lib';

import type { WhisperModelId } from '../model/types';

const MODEL_MIN_RAM_MB: Record<WhisperModelId, number> = {
  'whisper-tiny': 600,
  'whisper-base': 800,
  'whisper-small': 1600,
  'whisper-medium': 4000,
};

const MODEL_MIN_FREE_DISK_MB: Record<WhisperModelId, number> = {
  'whisper-tiny': 200,
  'whisper-base': 300,
  'whisper-small': 600,
  'whisper-medium': 2500,
};

export type DeviceCompatibilityResult = {
  isCompatible: boolean;
  reason?: string;
};

export const canDeviceRunWhisperModel = async (
  modelId: WhisperModelId,
): Promise<DeviceCompatibilityResult> => {
  try {
    const [totalRamBytes, freeDiskBytes] = await Promise.all([
      DeviceInfo.getTotalMemory(),
      DeviceInfo.getFreeDiskStorage(),
    ]);

    const totalRamMB = totalRamBytes / (1024 * 1024);
    const freeDiskMB = freeDiskBytes / (1024 * 1024);

    const minRam = MODEL_MIN_RAM_MB[modelId];
    const minDisk = MODEL_MIN_FREE_DISK_MB[modelId];

    const formatMb = (mb: number) =>
      mb >= 1024
        ? i18n.t('device.gb', { value: Math.round(mb / 1024) })
        : i18n.t('device.mb', { value: Math.round(mb) });

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
    console.warn('[canDeviceRunWhisperModel] Failed to check compatibility:', error);

    return {
      isCompatible: true,
      reason: undefined,
    };
  }
};

export const checkAllModelsCompatibility = async (): Promise<
  Record<WhisperModelId, DeviceCompatibilityResult>
> => {
  const modelIds: WhisperModelId[] = [
    'whisper-tiny',
    'whisper-base',
    'whisper-small',
    'whisper-medium',
  ];

  const results = await Promise.all(
    modelIds.map(async (id) => ({ id, result: await canDeviceRunWhisperModel(id) })),
  );

  return Object.fromEntries(results.map(({ id, result }) => [id, result])) as Record<
    WhisperModelId,
    DeviceCompatibilityResult
  >;
};
