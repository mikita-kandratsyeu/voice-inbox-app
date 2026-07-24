import {
  canPlayAmbientHaptic,
  hapticTranscriptionChunk as playTranscriptionChunk,
  hapticTranscriptionComplete,
  hapticTranscriptionFailed,
  hapticTranscriptionProcessingStart,
} from '@/shared/lib/haptics';

const CHUNK_HAPTIC_MIN_MS = 2500;

let lastChunkHapticAt = 0;

export {
  hapticTranscriptionComplete,
  hapticTranscriptionFailed,
  hapticTranscriptionProcessingStart,
};

/** Throttled tick when a transcription chunk completes. */
export const hapticTranscriptionChunk = (): void => {
  if (!canPlayAmbientHaptic()) return;
  const now = Date.now();
  if (now - lastChunkHapticAt < CHUNK_HAPTIC_MIN_MS) return;
  lastChunkHapticAt = now;
  playTranscriptionChunk();
};
