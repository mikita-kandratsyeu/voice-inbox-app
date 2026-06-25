import type { WhisperModelId, WhisperModelWeightsFormat } from '@/entities/settings';
import type { TranscriptionQualityMode } from '@/entities/settings/model/types';

import type { DevicePerformanceTier } from './devicePerformanceProfile';
import type { TranscriptionChunkProfile } from './transcribeAudio';

export type TranscriptionVadPolicy = 'skipSilentOnly' | 'trimSilence';

export const TRANSCRIPTION_QUALITY_MODES: TranscriptionQualityMode[] = [
  'fast',
  'balanced',
  'quality',
];

export function resolveVadPolicyForMode(mode: TranscriptionQualityMode): TranscriptionVadPolicy {
  return mode === 'fast' ? 'trimSilence' : 'skipSilentOnly';
}

export function applyQualityModeToChunkProfile(
  mode: TranscriptionQualityMode,
  base: TranscriptionChunkProfile,
  tier: DevicePerformanceTier,
): TranscriptionChunkProfile {
  if (mode === 'fast') {
    return {
      chunkDurationSec: tier === 'low' ? 24 : 30,
      chunkOverlapSec: base.chunkOverlapSec,
    };
  }

  if (mode === 'balanced') {
    return base;
  }

  return {
    chunkDurationSec: tier === 'high' ? 60 : tier === 'medium' ? 45 : 30,
    chunkOverlapSec: Math.max(base.chunkOverlapSec, 4),
  };
}

export function resolveWhisperModelForQualityMode(
  mode: TranscriptionQualityMode,
  format: WhisperModelWeightsFormat,
  recommendedModelId: WhisperModelId,
): { modelId: WhisperModelId; format: WhisperModelWeightsFormat } {
  if (mode === 'fast') {
    return { modelId: 'whisper-base', format: 'q5_1' };
  }

  if (mode === 'balanced') {
    return {
      modelId: recommendedModelId === 'whisper-tiny' ? 'whisper-base' : recommendedModelId,
      format: 'q5_1',
    };
  }

  if (recommendedModelId === 'whisper-tiny') {
    return { modelId: 'whisper-base', format };
  }

  if (format === 'q5_1' && recommendedModelId === 'whisper-small') {
    return { modelId: 'whisper-small', format: 'q5_1' };
  }

  return { modelId: recommendedModelId, format };
}
