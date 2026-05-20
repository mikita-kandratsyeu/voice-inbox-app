import type { WhisperModelId, WhisperModelWeightsFormat } from '@/entities/settings';
import { NitroFS } from '@/shared/lib/fs';
import { IS_IOS } from '@/shared/lib/platform';
import {
  getWhisperCoreMlEncoderSizeBytes,
  getWhisperModelPath,
  hasOtherInstalledWhisperWeights,
} from '@/shared/lib/whisper';

import { getModelFileSizeBytes } from './getModelFileSize';

/** On-disk bytes for one whisper variant (weights + shared Core ML when attributed). */
export async function getWhisperVariantStorageBytes(
  modelId: WhisperModelId,
  format: WhisperModelWeightsFormat,
  options?: { includeSharedCoreMl?: boolean },
): Promise<number> {
  let bytes = await getModelFileSizeBytes(modelId, format);
  if (bytes <= 0 || !IS_IOS || options?.includeSharedCoreMl === false) {
    return bytes;
  }

  const coreMlBytes = await getWhisperCoreMlEncoderSizeBytes(modelId);
  if (coreMlBytes <= 0) {
    return bytes;
  }

  const otherFormatInstalled = await hasOtherInstalledWhisperWeights(modelId, format);
  if (otherFormatInstalled) {
    return bytes;
  }

  return bytes + coreMlBytes;
}

/** Adds Core ML encoder size once per `modelId` to the first variant row (for storage breakdown). */
export async function applySharedCoreMlToWhisperVariantBytes<
  T extends { id: WhisperModelId; format: WhisperModelWeightsFormat; bytes: number },
>(entries: T[]): Promise<T[]> {
  if (!IS_IOS || entries.length === 0) {
    return entries;
  }

  const byModel = new Map<WhisperModelId, T[]>();
  for (const entry of entries) {
    const list = byModel.get(entry.id) ?? [];
    list.push(entry);
    byModel.set(entry.id, list);
  }

  const next = entries.map((e) => ({ ...e }));

  for (const [modelId, variants] of byModel) {
    const coreMlBytes = await getWhisperCoreMlEncoderSizeBytes(modelId);
    if (coreMlBytes <= 0) continue;

    const sorted = [...variants].sort((a, b) => {
      if (a.format === b.format) return 0;
      return a.format === 'q5_1' ? -1 : 1;
    });
    const target = next.find((e) => e.id === modelId && e.format === sorted[0]!.format);
    if (target) {
      target.bytes += coreMlBytes;
    }
  }

  return next;
}

export async function isWhisperWeightsOnDisk(
  modelId: WhisperModelId,
  format: WhisperModelWeightsFormat,
): Promise<boolean> {
  return NitroFS.exists(getWhisperModelPath(modelId, format));
}
