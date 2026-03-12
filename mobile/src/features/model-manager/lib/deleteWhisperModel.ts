import type { WhisperModelId } from '@/entities/settings';
import FS from '@/shared/lib/fs/fsAdapter';
import { getWhisperModelPath } from '@/shared/lib/whisper';

export const deleteWhisperModel = async (modelId: WhisperModelId): Promise<void> => {
  const path = getWhisperModelPath(modelId);
  const exists = await FS.exists(path);

  if (exists) {
    await FS.unlink(path);
  }
};
