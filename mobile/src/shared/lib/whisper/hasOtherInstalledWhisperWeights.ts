import type { WhisperModelId, WhisperModelWeightsFormat } from '@/entities/settings';
import { NitroFS } from '@/shared/lib/fs';

import { getWhisperModelPath } from './whisperModelPath';

const WHISPER_WEIGHTS_FORMATS: WhisperModelWeightsFormat[] = ['q5_1', 'full'];

/** True when another weights variant (compact/full) for the same model id is still on disk. */
export async function hasOtherInstalledWhisperWeights(
  modelId: WhisperModelId,
  excludingFormat: WhisperModelWeightsFormat,
): Promise<boolean> {
  for (const format of WHISPER_WEIGHTS_FORMATS) {
    if (format === excludingFormat) continue;
    if (await NitroFS.exists(getWhisperModelPath(modelId, format))) {
      return true;
    }
  }
  return false;
}
