import {
  getWhisperEstimatedDownloadSizeMb,
  type WhisperModelId,
  type WhisperModelWeightsFormat,
} from '@/entities/settings';

import { isWhisperCoreMlEncoderInstalled } from './isWhisperCoreMlEncoderInstalled';

export async function getWhisperEstimatedDownloadBytes(
  modelId: WhisperModelId,
  format: WhisperModelWeightsFormat,
): Promise<number> {
  const coreMlInstalled = await isWhisperCoreMlEncoderInstalled(modelId);
  const sizeMb = getWhisperEstimatedDownloadSizeMb(modelId, format, {
    coreMlAlreadyInstalled: coreMlInstalled,
  });
  return sizeMb * 1024 * 1024;
}
