import type {
  LocalAiModelId,
  WhisperModelId,
  WhisperModelWeightsFormat,
} from '@/entities/settings';
import { getWhisperEstimatedDownloadSizeMb } from '@/entities/settings/model/constants';
import { NitroFS } from '@/shared/lib/fs';
import { getLocalLlmModelPath } from '@/shared/lib/local-llm';
import { IS_IOS } from '@/shared/lib/platform';
import {
  formatFileSize,
  getWhisperModelPath,
  isWhisperCoreMlEncoderInstalled,
} from '@/shared/lib/whisper';

export const getModelFileSizeBytes = async (
  modelId: WhisperModelId,
  format: WhisperModelWeightsFormat = 'q5_1',
): Promise<number> => {
  try {
    const path = getWhisperModelPath(modelId, format);
    const exists = await NitroFS.exists(path);

    if (!exists) return 0;

    const stat = await NitroFS.stat(path);
    return stat.size;
  } catch {
    return 0;
  }
};

export const getModelFileSizeFormatted = async (
  modelId: WhisperModelId,
  format: WhisperModelWeightsFormat = 'q5_1',
): Promise<string> => {
  const bytes = await getModelFileSizeBytes(modelId, format);
  return formatFileSize(bytes);
};

export { getWhisperVariantStorageBytes } from './getWhisperVariantStorageBytes';

/** Display / estimate size for picker (weights + Core ML when applicable). */
export async function getWhisperVariantDisplaySizeBytes(
  modelId: WhisperModelId,
  format: WhisperModelWeightsFormat,
  options: { downloaded: boolean },
): Promise<number> {
  if (options.downloaded) {
    const { getWhisperVariantStorageBytes } = await import('./getWhisperVariantStorageBytes');
    return getWhisperVariantStorageBytes(modelId, format);
  }

  const coreMlInstalled = IS_IOS ? await isWhisperCoreMlEncoderInstalled(modelId) : false;
  return (
    getWhisperEstimatedDownloadSizeMb(modelId, format, {
      coreMlAlreadyInstalled: coreMlInstalled,
    }) *
    1024 *
    1024
  );
}

export const getLocalLlmModelFileSizeBytes = async (modelId: LocalAiModelId): Promise<number> => {
  try {
    const path = getLocalLlmModelPath(modelId);
    const exists = await NitroFS.exists(path);

    if (!exists) return 0;

    const stat = await NitroFS.stat(path);

    return stat.size;
  } catch {
    return 0;
  }
};
