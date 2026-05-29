import { type ContextOptions, isUseCoreML } from 'whisper.rn';

import type { WhisperModelId } from '@/entities/settings';
import { IS_IOS } from '@/shared/lib/platform';

import { isWhisperCoreMlEncoderInstalled } from './isWhisperCoreMlEncoderInstalled';

export type WhisperContextInitOptions = Pick<ContextOptions, 'useGpu' | 'useCoreMLIos'>;

/**
 * whisper.rn: Core ML is iOS-only. Metal (`useGpu`) must be off when Core ML is on,
 * otherwise native code disables Core ML. Android uses default GPU/CPU backend.
 */
export async function resolveWhisperContextInitOptions(
  modelId: WhisperModelId,
): Promise<WhisperContextInitOptions> {
  if (!IS_IOS) {
    return {};
  }

  if (!isUseCoreML) {
    return { useGpu: false };
  }

  const encoderReady = await isWhisperCoreMlEncoderInstalled(modelId);
  if (__DEV__ && !encoderReady) {
    console.warn(
      `[whisper] Core ML encoder bundle missing for ${modelId} — re-download the model; native may fall back to CPU`,
    );
  }

  return {
    useGpu: false,
    useCoreMLIos: true,
  };
}

export async function isWhisperCoreMlSupportedForModel(modelId: WhisperModelId): Promise<boolean> {
  return IS_IOS && isUseCoreML && (await isWhisperCoreMlEncoderInstalled(modelId));
}
