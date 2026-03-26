import RNFS from 'react-native-fs';

import type { WhisperModelId, WhisperModelWeightsFormat } from '@/entities/settings';
import {
  getWhisperModelPath,
  getWhisperModelsDir,
  removeWhisperCoreMlEncoder,
} from '@/shared/lib/whisper';

export const deleteWhisperModel = async (
  modelId: WhisperModelId,
  format: WhisperModelWeightsFormat,
): Promise<void> => {
  const modelPath = getWhisperModelPath(modelId, format);
  if (await RNFS.exists(modelPath)) await RNFS.unlink(modelPath);

  const coreMlZipTemp = `${getWhisperModelsDir()}/.${modelId}.coreml-encoder.zip`;
  if (await RNFS.exists(coreMlZipTemp)) {
    await RNFS.unlink(coreMlZipTemp);
  }

  await removeWhisperCoreMlEncoder(modelId).catch(() => {});
};
