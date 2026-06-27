import type { WhisperModelId } from '@/entities/settings';
import { getDocumentDirectoryPath } from '@/shared/lib/fs';

const argmaxModelsDir = (): string => `${getDocumentDirectoryPath()}/argmax-models`;

export const getArgmaxModelsDir = (): string => argmaxModelsDir();

export const getWhisperKitModelsDir = (): string => `${argmaxModelsDir()}/whisperkit`;

export const getSpeakerKitModelsDir = (): string => `${argmaxModelsDir()}/speakerkit`;

export const getTranscriptionJobsCacheDir = (): string =>
  `${getDocumentDirectoryPath()}/transcription-jobs`;

/**
 * WhisperKit on-disk totals (MelSpectrogram + AudioEncoder + TextDecoder Core ML bundles).
 * Source: argmaxinc/whisperkit-coreml on Hugging Face, rounded up for HF cache during download.
 */
export const WHISPER_KIT_ESTIMATED_DOWNLOAD_MB: Partial<Record<WhisperModelId, number>> = {
  'whisper-base': 145,
  'whisper-small': 470,
  'whisper-medium': 630,
  'whisper-large-v3-turbo': 960,
};

export const getWhisperKitEstimatedDownloadMb = (modelId: WhisperModelId): number =>
  WHISPER_KIT_ESTIMATED_DOWNLOAD_MB[modelId] ?? 150;

export const getWhisperKitEstimatedDownloadBytes = (modelId: WhisperModelId): number =>
  getWhisperKitEstimatedDownloadMb(modelId) * 1024 * 1024;

/** Maps app WhisperModelId settings to WhisperKit HuggingFace variant names. */
export const mapWhisperModelIdToWhisperKitModel = (modelId: WhisperModelId): string => {
  switch (modelId) {
    case 'whisper-tiny':
      return 'openai_whisper-tiny';
    case 'whisper-base':
      return 'openai_whisper-base';
    case 'whisper-small':
      return 'openai_whisper-small';
    case 'whisper-medium':
      return 'openai_whisper-large-v3-v20240930_626MB';
    case 'whisper-large-v3-turbo':
      return 'openai_whisper-large-v3-v20240930_turbo';
    default:
      return 'openai_whisper-base';
  }
};

export const mapWhisperKitModelToPublicSize = (
  modelId: WhisperModelId,
): 'base' | 'small' | 'medium' | 'large' => {
  switch (modelId) {
    case 'whisper-tiny':
    case 'whisper-base':
      return 'base';
    case 'whisper-small':
      return 'small';
    case 'whisper-medium':
      return 'medium';
    case 'whisper-large-v3-turbo':
      return 'large';
    default:
      return 'base';
  }
};
