import type { WhisperModelId, WhisperModelVariantId } from '@/entities/settings';
import { IS_IOS } from '@/shared/lib/platform';
import {
  getWhisperKitModelsDir,
  mapWhisperModelIdToWhisperKitModel,
} from '@/shared/lib/whisper/whisperKitModelPath';

import { shouldUseIosWhisperKitEngine } from '../config/transcriptionEngine';
import {
  isIosNativeTranscriptionAvailable,
  isWhisperKitModelDownloaded,
} from './nativeTranscription';

export type TranscriptionModelEngine = 'whisper-rn' | 'whisperkit-ios';

export function resolveTranscriptionModelEngine(): TranscriptionModelEngine {
  return shouldUseIosWhisperKitEngine() ? 'whisperkit-ios' : 'whisper-rn';
}

export async function isWhisperKitModelReady(modelId: WhisperModelId): Promise<boolean> {
  if (!IS_IOS || !shouldUseIosWhisperKitEngine()) {
    return false;
  }
  const available = await isIosNativeTranscriptionAvailable();
  if (!available) {
    return false;
  }
  return isWhisperKitModelDownloaded(
    mapWhisperModelIdToWhisperKitModel(modelId),
    getWhisperKitModelsDir(),
  );
}

export function shouldSkipGgmlPreflightForIos(_modelId: WhisperModelId): boolean {
  return shouldUseIosWhisperKitEngine();
}

export function resolveCheckpointEngine(): TranscriptionModelEngine {
  return resolveTranscriptionModelEngine();
}

export function isSameCheckpointEngine(
  storedEngine: TranscriptionModelEngine | undefined,
  current: TranscriptionModelEngine,
): boolean {
  return (storedEngine ?? 'whisper-rn') === current;
}

export function whisperVariantUsesGgmlOnCurrentPlatform(
  _variantId: WhisperModelVariantId,
): boolean {
  return !shouldUseIosWhisperKitEngine();
}
