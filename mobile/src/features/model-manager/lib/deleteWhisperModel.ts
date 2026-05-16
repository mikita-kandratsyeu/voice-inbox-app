import type { WhisperModelId, WhisperModelWeightsFormat } from '@/entities/settings';
import { NitroFS } from '@/shared/lib/fs';
import {
  getWhisperCoreMlZipTempPath,
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

  const coreMlZipTemp = getWhisperCoreMlZipTempPath(modelId);
  const isCoreMlZipTempExists = await NitroFS.exists(coreMlZipTemp);

  if (isCoreMlZipTempExists) {
    await NitroFS.unlink(coreMlZipTemp);
  }

  const legacyCoreMlZip = `${getWhisperModelsDir()}/.${modelId}.coreml-encoder.zip`;
  if (await NitroFS.exists(legacyCoreMlZip)) {
    await NitroFS.unlink(legacyCoreMlZip);
  }

  await removeWhisperCoreMlEncoder(modelId).catch(() => {});
};
