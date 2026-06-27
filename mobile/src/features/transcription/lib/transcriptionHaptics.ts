import { AppState } from 'react-native';

import { shouldReduceMotion } from '@/shared/config/animations';
import { hapticError, hapticLight, hapticSelection, hapticSuccess } from '@/shared/lib';

const CHUNK_HAPTIC_MIN_MS = 2500;

let lastChunkHapticAt = 0;

const canPlayAmbientHaptic = (): boolean =>
  AppState.currentState === 'active' && !shouldReduceMotion();

/** Fired when the model is loaded and chunk transcription begins. */
export const hapticTranscriptionProcessingStart = (): void => {
  if (!canPlayAmbientHaptic()) return;
  hapticLight();
};

/** Throttled tick when a transcription chunk completes. */
export const hapticTranscriptionChunk = (): void => {
  if (!canPlayAmbientHaptic()) return;
  const now = Date.now();
  if (now - lastChunkHapticAt < CHUNK_HAPTIC_MIN_MS) return;
  lastChunkHapticAt = now;
  hapticSelection();
};

export const hapticTranscriptionComplete = (): void => {
  if (!canPlayAmbientHaptic()) return;
  hapticSuccess();
};

export const hapticTranscriptionFailed = (): void => {
  if (!canPlayAmbientHaptic()) return;
  hapticError();
};
