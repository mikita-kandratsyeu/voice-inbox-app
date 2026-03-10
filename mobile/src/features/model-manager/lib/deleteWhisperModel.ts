import RNFS from 'react-native-fs';

import type { WhisperModelId } from '@/entities/settings';
import { getWhisperModelPath } from '@/shared/lib/whisper';

export const deleteWhisperModel = async (modelId: WhisperModelId): Promise<void> => {
  const path = getWhisperModelPath(modelId);
  const exists = await RNFS.exists(path);

  if (exists) {
    await RNFS.unlink(path);
  }
};
