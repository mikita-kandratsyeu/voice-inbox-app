import {
  WHISPER_MODELS,
  type WhisperModelId,
  type WhisperModelWeightsFormat,
} from '@/entities/settings';
import { getDocumentDirectoryPath } from '@/shared/lib/fs';

const whisperModelsDir = (): string => `${getDocumentDirectoryPath()}/whisper-models`;

const MODEL_FILE_NAMES: Record<WhisperModelWeightsFormat, Record<WhisperModelId, string>> = {
  q5_1: {
    'whisper-tiny': 'ggml-tiny-q5_1.bin',
    'whisper-base': 'ggml-base-q5_1.bin',
    'whisper-small': 'ggml-small-q5_1.bin',
    'whisper-medium': 'ggml-medium.bin',
    'whisper-large-v3-turbo': 'ggml-medium.bin',
  },
  full: {
    'whisper-tiny': 'ggml-tiny.bin',
    'whisper-base': 'ggml-base.bin',
    'whisper-small': 'ggml-small.bin',
    'whisper-medium': 'ggml-medium.bin',
    'whisper-large-v3-turbo': 'ggml-medium.bin',
  },
};

export const getWhisperModelsDir = (): string => whisperModelsDir();

export const getWhisperModelPath = (
  modelId: WhisperModelId,
  format: WhisperModelWeightsFormat = 'q5_1',
): string => `${whisperModelsDir()}/${MODEL_FILE_NAMES[format][modelId]}`;

export const getWhisperModelFileName = (
  modelId: WhisperModelId,
  format: WhisperModelWeightsFormat = 'q5_1',
): string => MODEL_FILE_NAMES[format][modelId];

const WHISPER_MODEL_DOWNLOAD_URLS_BY_FORMAT: Record<
  WhisperModelWeightsFormat,
  Record<WhisperModelId, string>
> = {
  q5_1: {
    'whisper-tiny': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny-q5_1.bin',
    'whisper-base': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin',
    'whisper-small':
      'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin',
    'whisper-medium': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
    'whisper-large-v3-turbo':
      'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
  },
  full: {
    'whisper-tiny': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
    'whisper-base': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    'whisper-small': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
    'whisper-medium': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
    'whisper-large-v3-turbo':
      'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
  },
};

export const getWhisperModelDownloadUrl = (
  modelId: WhisperModelId,
  format: WhisperModelWeightsFormat = 'q5_1',
): string => WHISPER_MODEL_DOWNLOAD_URLS_BY_FORMAT[format][modelId];

export const WHISPER_COREML_ENCODER_ZIP: Record<WhisperModelId, string> = {
  'whisper-tiny': 'ggml-tiny-encoder.mlmodelc.zip',
  'whisper-base': 'ggml-base-encoder.mlmodelc.zip',
  'whisper-small': 'ggml-small-encoder.mlmodelc.zip',
  'whisper-medium': 'ggml-medium-encoder.mlmodelc.zip',
  'whisper-large-v3-turbo': 'ggml-medium-encoder.mlmodelc.zip',
};

export const getWhisperCoreMlEncoderDirName = (modelId: WhisperModelId): string =>
  WHISPER_COREML_ENCODER_ZIP[modelId].replace(/\.zip$/i, '');

export const getWhisperCoreMlEncoderPath = (modelId: WhisperModelId): string =>
  `${whisperModelsDir()}/${getWhisperCoreMlEncoderDirName(modelId)}`;

/** Temp path for downloaded Core ML zip (no leading `.` — some iOS unzip stacks fail on hidden names). */
export const getWhisperCoreMlZipTempPath = (modelId: WhisperModelId): string =>
  `${whisperModelsDir()}/vi-coreml-encoder-${modelId}.tmp.zip`;

export const getWhisperCoreMlDownloadUrl = (modelId: WhisperModelId): string =>
  `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${WHISPER_COREML_ENCODER_ZIP[modelId]}`;

export const getWhisperModelShortLabelKey = (modelId: string): `whisper.models.${string}` => {
  const suffix = modelId.replace(/^whisper-/, '').replace(/-/g, '_');
  return `whisper.models.${suffix}`;
};

export const getWhisperLabel = (modelId: string): string => {
  const model = WHISPER_MODELS.find((model) => model.id === modelId);

  if (model) {
    return `Whisper ${model.name}`;
  }

  return 'Whisper model';
};
