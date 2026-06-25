import type { TranscriptionQualityMode } from '@/entities/settings/model/types';

import { getDevicePerformanceProfile } from './devicePerformanceProfile';
import type { TranscriptionChunkProfile } from './transcribeAudio';
import {
  applyQualityModeToChunkProfile,
} from './transcriptionQualityMode';

/**
 * Resolves optimal chunk profile based on device performance, power state, and quality mode.
 */
export function resolveTranscriptionChunkProfile(
  qualityMode: TranscriptionQualityMode,
): TranscriptionChunkProfile {
  const profile = getDevicePerformanceProfile({ respectPowerMode: true });
  const base = {
    chunkDurationSec: profile.optimalChunkDurationSec,
    chunkOverlapSec: profile.optimalChunkOverlapSec,
  };

  return applyQualityModeToChunkProfile(qualityMode, base, profile.tier);
}
