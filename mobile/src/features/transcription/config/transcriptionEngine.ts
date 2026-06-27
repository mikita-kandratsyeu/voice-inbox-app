import { useSettingsStore } from '@/entities/settings';
import { IS_IOS } from '@/shared/lib/platform';

/** Offline ASR runtime used for transcription. */
export type TranscriptionEngineId = 'whisper-rn' | 'whisperkit-ios';

export function getTranscriptionEngineForPlatform(): TranscriptionEngineId {
  if (shouldUseIosWhisperKitEngine()) {
    return 'whisperkit-ios';
  }
  return 'whisper-rn';
}

export function shouldUseIosWhisperKitEngine(): boolean {
  if (!IS_IOS) {
    return false;
  }
  return useSettingsStore.getState().iosWhisperKitEngineEnabled;
}

export function shouldUseWhisperRnEngine(): boolean {
  return getTranscriptionEngineForPlatform() === 'whisper-rn';
}
