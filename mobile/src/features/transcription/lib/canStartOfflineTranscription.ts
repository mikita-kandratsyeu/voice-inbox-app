import type { WhisperModelId, WhisperModelStatus } from '@/entities/settings';

import { shouldUseIosWhisperKitEngine } from '../config/transcriptionEngine';
import { isWhisperKitModelReady } from './transcriptionModelEngine';

/** Whether offline transcription can start for the selected model/engine. */
export async function canStartOfflineTranscription(
  modelId: WhisperModelId,
  modelStatus: WhisperModelStatus,
): Promise<boolean> {
  if (shouldUseIosWhisperKitEngine()) {
    return isWhisperKitModelReady(modelId);
  }
  return modelStatus === 'downloaded';
}
