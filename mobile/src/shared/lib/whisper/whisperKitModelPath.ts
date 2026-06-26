import type { WhisperModelId } from '@/entities/settings';
import { getDocumentDirectoryPath } from '@/shared/lib/fs';

const argmaxModelsDir = (): string => `${getDocumentDirectoryPath()}/argmax-models`;

export const getArgmaxModelsDir = (): string => argmaxModelsDir();

export const getWhisperKitModelsDir = (): string => `${argmaxModelsDir()}/whisperkit`;

export const getSpeakerKitModelsDir = (): string => `${argmaxModelsDir()}/speakerkit`;

export const getTranscriptionJobsCacheDir = (): string =>
  `${getDocumentDirectoryPath()}/transcription-jobs`;

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
    default:
      return 'openai_whisper-base';
  }
};

export const mapWhisperKitModelToPublicSize = (
  modelId: WhisperModelId,
): 'base' | 'small' | 'medium' => {
  switch (modelId) {
    case 'whisper-tiny':
    case 'whisper-base':
      return 'base';
    case 'whisper-small':
      return 'small';
    case 'whisper-medium':
      return 'medium';
    default:
      return 'base';
  }
};
