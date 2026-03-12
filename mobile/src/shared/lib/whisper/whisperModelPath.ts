import type { WhisperModelId } from '@/entities/settings';
import FS from '@/shared/lib/fs/fsAdapter';

const WHISPER_MODELS_DIR = `${FS.DOCUMENT_DIR}/whisper-models`;

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
