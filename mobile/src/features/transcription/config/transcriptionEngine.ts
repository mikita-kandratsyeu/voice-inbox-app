import { IS_IOS } from '@/shared/lib/platform';

import { useSettingsStore } from '@/entities/settings';

/** Offline ASR runtime used for transcription. */
export type TranscriptionEngineId = 'whisper-rn' | 'whisperkit-ios';

/**
 * Build-time rollout gate. Keep false until WhisperKit path is validated on device.
 * User setting `iosWhisperKitEngineEnabled` is honored only when this is true.
 */
export const IOS_WHISPERKIT_ROLLOUT_ENABLED = true;

export function getTranscriptionEngineForPlatform(): TranscriptionEngineId {
  if (shouldUseIosWhisperKitEngine()) {
    return 'whisperkit-ios';
  }
  return 'whisper-rn';
}

export function shouldUseIosWhisperKitEngine(): boolean {
  if (!IS_IOS || !IOS_WHISPERKIT_ROLLOUT_ENABLED) {
    return false;
  }
  return useSettingsStore.getState().iosWhisperKitEngineEnabled;
}

export function shouldUseWhisperRnEngine(): boolean {
  return getTranscriptionEngineForPlatform() === 'whisper-rn';
}
