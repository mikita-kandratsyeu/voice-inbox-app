import NitroFS from 'react-native-nitro-fs';

import type { WhisperModelId } from '@/entities/settings';
import { getWhisperModelPath } from '@/shared/lib/whisper';

export const deleteWhisperModel = async (modelId: WhisperModelId): Promise<void> => {
  const path = getWhisperModelPath(modelId);
  const exists = await NitroFS.exists(path);

  if (exists) {
    await NitroFS.unlink(path);
  }
};
