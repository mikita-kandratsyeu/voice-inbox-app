import type { WhisperModelId } from '@/entities/settings';
import { NitroFS } from '@/shared/lib/fs';
import { IS_IOS } from '@/shared/lib/platform';

import { getWhisperCoreMlEncoderPath } from './whisperModelPath';

/** True when the Core ML encoder bundle is on disk (matches initWhisper `useCoreMLIos` on iOS). */
export async function isWhisperCoreMlEncoderInstalled(modelId: WhisperModelId): Promise<boolean> {
  if (!IS_IOS) return false;
  return NitroFS.exists(getWhisperCoreMlEncoderPath(modelId));
}
