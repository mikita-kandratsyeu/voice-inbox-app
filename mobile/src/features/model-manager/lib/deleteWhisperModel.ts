import RNFS from 'react-native-fs';

import type { WhisperModelId } from '@/entities/settings';
import {
  getWhisperModelPath,
  getWhisperModelsDir,
  removeWhisperCoreMlEncoder,
} from '@/shared/lib/whisper';

export const deleteWhisperModel = async (modelId: WhisperModelId): Promise<void> => {
  const qPath = getWhisperModelPath(modelId, 'q5_1');
  const fullPath = getWhisperModelPath(modelId, 'full');
  if (await RNFS.exists(qPath)) await RNFS.unlink(qPath);
  if (fullPath !== qPath && (await RNFS.exists(fullPath))) await RNFS.unlink(fullPath);

  const coreMlZipTemp = `${getWhisperModelsDir()}/.${modelId}.coreml-encoder.zip`;
  if (await RNFS.exists(coreMlZipTemp)) {
    await RNFS.unlink(coreMlZipTemp);
  }

  await removeWhisperCoreMlEncoder(modelId).catch(() => {});
};
