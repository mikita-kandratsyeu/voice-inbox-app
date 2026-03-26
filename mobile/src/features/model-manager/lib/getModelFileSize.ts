import RNFS from 'react-native-fs';

import type { WhisperModelId, WhisperModelWeightsFormat } from '@/entities/settings';
import { formatFileSize } from '@/shared/lib/whisper';
import { getWhisperModelPath } from '@/shared/lib/whisper';

export const getModelFileSizeBytes = async (
  modelId: WhisperModelId,
  format: WhisperModelWeightsFormat = 'q5_1',
): Promise<number> => {
  try {
    const path = getWhisperModelPath(modelId, format);
    const exists = await RNFS.exists(path);

    if (!exists) return 0;

    const stat = await RNFS.stat(path);
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
