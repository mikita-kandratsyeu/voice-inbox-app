import type { WhisperModelId } from '@/entities/settings';
import FS from '@/shared/lib/fs/fsAdapter';
import { formatFileSize } from '@/shared/lib/whisper';
import { getWhisperModelPath } from '@/shared/lib/whisper';

export const getModelFileSizeBytes = async (modelId: WhisperModelId): Promise<number> => {
  try {
    const path = getWhisperModelPath(modelId);
    const exists = await FS.exists(path);

    if (!exists) return 0;

    const stat = await FS.stat(path);
    return stat.size;
  } catch {
    return 0;
  }
};

export const getModelFileSizeFormatted = async (modelId: WhisperModelId): Promise<string> => {
  const bytes = await getModelFileSizeBytes(modelId);
  return formatFileSize(bytes);
};
