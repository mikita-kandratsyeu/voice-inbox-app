import RNFS from 'react-native-fs';

import { WHISPER_MODELS, type WhisperModelId } from '@/entities/settings';

const WHISPER_MODELS_DIR = `${RNFS.DocumentDirectoryPath}/whisper-models`;

const MODEL_FILE_NAMES: Record<WhisperModelId, string> = {
  'whisper-tiny': 'ggml-tiny.bin',
  'whisper-base': 'ggml-base.bin',
  'whisper-small': 'ggml-small.bin',
  'whisper-medium': 'ggml-medium.bin',
};

export const getWhisperModelsDir = (): string => WHISPER_MODELS_DIR;

export const getWhisperModelPath = (modelId: WhisperModelId): string =>
  `${WHISPER_MODELS_DIR}/${MODEL_FILE_NAMES[modelId]}`;

export const getWhisperModelFileName = (modelId: WhisperModelId): string =>
  MODEL_FILE_NAMES[modelId];

export const WHISPER_MODEL_DOWNLOAD_URLS: Record<WhisperModelId, string> = {
  'whisper-tiny': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
  'whisper-base': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
  'whisper-small': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
  'whisper-medium': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
};

export const WHISPER_COREML_ENCODER_ZIP: Record<WhisperModelId, string> = {
  'whisper-tiny': 'ggml-tiny-encoder.mlmodelc.zip',
  'whisper-base': 'ggml-base-encoder.mlmodelc.zip',
  'whisper-small': 'ggml-small-encoder.mlmodelc.zip',
  'whisper-medium': 'ggml-medium-encoder.mlmodelc.zip',
};

export const getWhisperCoreMlEncoderDirName = (modelId: WhisperModelId): string =>
  WHISPER_COREML_ENCODER_ZIP[modelId].replace(/\.zip$/i, '');

export const getWhisperCoreMlEncoderPath = (modelId: WhisperModelId): string =>
  `${WHISPER_MODELS_DIR}/${getWhisperCoreMlEncoderDirName(modelId)}`;

export const getWhisperCoreMlDownloadUrl = (modelId: WhisperModelId): string =>
  `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${WHISPER_COREML_ENCODER_ZIP[modelId]}`;

export const getWhisperLabel = (modelId: string): string => {
  const model = WHISPER_MODELS.find((model) => model.id === modelId);

  if (model) {
    return `Whisper ${model.name}`;
  }

  return 'Whisper model';
};
