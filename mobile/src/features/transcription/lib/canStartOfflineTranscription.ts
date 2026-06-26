import type { WhisperModelStatus } from '@/entities/settings';

import { shouldUseIosWhisperKitEngine } from '../config/transcriptionEngine';
import { isIosNativeTranscriptionAvailable } from './nativeTranscription';

/** Whether offline transcription can start for the selected model/engine. */
export async function canStartOfflineTranscription(
  modelStatus: WhisperModelStatus,
): Promise<boolean> {
  if (shouldUseIosWhisperKitEngine()) {
    return isIosNativeTranscriptionAvailable();
  }
  return modelStatus === 'downloaded';
}
