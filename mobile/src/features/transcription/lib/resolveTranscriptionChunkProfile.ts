import { getDevicePerformanceProfile } from './devicePerformanceProfile';
import type { TranscriptionChunkProfile } from './transcribeAudio';

/**
 * Resolves optimal chunk profile based on device performance and power state
 */
export function resolveTranscriptionChunkProfile(): TranscriptionChunkProfile {
  const profile = getDevicePerformanceProfile({ respectPowerMode: true });

  return {
    chunkDurationSec: profile.optimalChunkDurationSec,
    chunkOverlapSec: profile.optimalChunkOverlapSec,
  };
}
