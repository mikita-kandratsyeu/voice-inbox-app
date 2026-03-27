import type { WhisperModelId, WhisperModelWeightsFormat } from '@/entities/settings';
import { NitroFS } from '@/shared/lib/fs';
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
  const isExists = await NitroFS.exists(modelPath);

  if (isExists) {
    await NitroFS.unlink(modelPath);
  }

  const coreMlZipTemp = `${getWhisperModelsDir()}/.${modelId}.coreml-encoder.zip`;
  const isCoreMlZipTempExists = await NitroFS.exists(coreMlZipTemp);

  if (isCoreMlZipTempExists) {
    await NitroFS.unlink(coreMlZipTemp);
  }

  await removeWhisperCoreMlEncoder(modelId).catch(() => {});
};
