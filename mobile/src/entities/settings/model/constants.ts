import { IS_IOS } from '@/shared/lib/platform';

import type {
  AIModel,
  LocalAiModelId,
  UserFacingAIModel,
  WhisperModel,
  WhisperModelId,
  WhisperModelVariantId,
  WhisperModelWeightsFormat,
} from './types';

export const USER_FACING_AI_MODELS: UserFacingAIModel[] = [
  {
    id: 'google/gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    provider: 'Google',
    descriptionKey: 'aiModels.geminiDesc2_5',
    speed: 'fast',
    tierLabelKey: 'aiModels.tierFast',
    supportTierCode: 'fast',
    contextTokens: 1_048_576,
  },
  {
    id: 'google/gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    provider: 'Google',
    descriptionKey: 'aiModels.geminiDesc3_1',
    speed: 'fast',
    tierLabelKey: 'aiModels.tierSmart',
    supportTierCode: 'smarter',
    contextTokens: 1_048_576,
  },
  {
    id: 'deepseek/deepseek-v4-flash',
    name: 'DeepSeek V4 Flash',
    provider: 'DeepSeek',
    descriptionKey: 'aiModels.deepSeekDesc',
    speed: 'medium',
    tierLabelKey: 'aiModels.tierDeepSeek',
    supportTierCode: 'fast',
    contextTokens: 1_048_576,
  },
  {
    id: 'xiaomi/mimo-v2-flash',
    name: 'MiMo V2 Flash',
    provider: 'Xiaomi',
    descriptionKey: 'aiModels.mimoDesc',
    speed: 'medium',
    tierLabelKey: 'aiModels.tierMiMo',
    supportTierCode: 'fast',
    contextTokens: 262_144,
  },
  {
    id: 'minimax/minimax-m2.7',
    name: 'MiniMax M2.7',
    provider: 'MiniMax',
    descriptionKey: 'aiModels.minimaxDesc',
    speed: 'slow',
    tierLabelKey: 'aiModels.tierPremium',
    supportTierCode: 'premium_experimental',
    contextTokens: 1_048_576,
  },
];

const AI_MODEL_SPEED_RANK: Record<UserFacingAIModel['speed'], number> = {
  fast: 0,
  medium: 1,
  slow: 2,
};

/** Manual picker / onboarding list: fastest models first. */
export const USER_FACING_AI_MODELS_BY_SPEED = [...USER_FACING_AI_MODELS].sort(
  (a, b) => AI_MODEL_SPEED_RANK[a.speed] - AI_MODEL_SPEED_RANK[b.speed],
);

export const AI_MODELS: AIModel[] = USER_FACING_AI_MODELS.map(
  ({ tierLabelKey: _t, supportTierCode: _s, ...m }) => m,
);

/** Rough RAM / process pressure hint for on-device GGUF (not exact MB). */
export type LocalAiDeviceLoad = 'light' | 'moderate' | 'heavy';

export type LocalAiModelCatalogEntry = {
  id: LocalAiModelId;
  name: string;
  provider: string;
  descriptionKey: string;
  speed: 'fast' | 'medium' | 'slow';
  deviceLoad: LocalAiDeviceLoad;
  fileName: string;
  sizeMb: number;
  downloadUrl: string;
};

export const LOCAL_AI_MODELS: LocalAiModelCatalogEntry[] = [
  {
    id: 'local/llama-3.2-1b-q4_k_m',
    name: 'Llama 3.2 1B',
    provider: 'Meta',
    descriptionKey: 'aiModels.localLlama32_1bDesc',
    speed: 'fast',
    deviceLoad: 'light',
    fileName: 'llama-3.2-1b.gguf',
    sizeMb: 808,
    downloadUrl:
      'https://huggingface.co/QuantFactory/Vikhr-Llama-3.2-1B-Instruct-GGUF/resolve/main/Vikhr-Llama-3.2-1B-Instruct.Q4_K_M.gguf',
  },
  {
    id: 'local/qwen3-1.7b-q4_k_m',
    name: 'Qwen3 1.7B',
    provider: 'Qwen',
    descriptionKey: 'aiModels.localQwen3Desc',
    speed: 'fast',
    deviceLoad: 'moderate',
    fileName: 'Qwen3-1.7B-Q4_K_M.gguf',
    sizeMb: 1200,
    downloadUrl:
      'https://huggingface.co/unsloth/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q4_K_M.gguf',
  },
  {
    id: 'local/gemma-2-2b-it-q4_k_m',
    name: 'Gemma 2 2B',
    provider: 'Google',
    descriptionKey: 'aiModels.localGemma2Desc',
    speed: 'medium',
    deviceLoad: 'heavy',
    fileName: 'gemma-2-2b-it-Q4_K_M.gguf',
    sizeMb: 1600,
    downloadUrl:
      'https://huggingface.co/codegood/gemma-2b-it-Q4_K_M-GGUF/resolve/main/gemma-2b-it.Q4_K_M.gguf',
  },
];

export const DEFAULT_LOCAL_AI_MODEL_ID: LocalAiModelId = 'local/llama-3.2-1b-q4_k_m';

export const getLocalAiModelEntry = (id: LocalAiModelId): LocalAiModelCatalogEntry | undefined =>
  LOCAL_AI_MODELS.find((m) => m.id === id);

export const WHISPER_MODELS: WhisperModel[] = [
  {
    id: 'whisper-tiny',
    name: 'Tiny',
    description: 'whisper.models.tinyDesc',
    sizeLabel: '31 MB',
    sizeMb: 31,
    accuracy: 'low',
    speed: 'fast',
    status: 'not_downloaded',
  },
  {
    id: 'whisper-base',
    name: 'Base',
    description: 'whisper.models.baseDesc',
    sizeLabel: '57 MB',
    sizeMb: 57,
    accuracy: 'medium',
    speed: 'fast',
    status: 'not_downloaded',
  },
  {
    id: 'whisper-small',
    name: 'Small',
    description: 'whisper.models.smallDesc',
    sizeLabel: '182 MB',
    sizeMb: 182,
    accuracy: 'medium',
    speed: 'medium',
    status: 'not_downloaded',
  },
  {
    id: 'whisper-medium',
    name: 'Medium',
    description: 'whisper.models.mediumDesc',
    sizeLabel: '1.5 GB',
    sizeMb: 1500,
    accuracy: 'high',
    speed: 'slow',
    status: 'not_downloaded',
  },
];

export const DEFAULT_SELECTED_WHISPER_MODEL_ID: WhisperModelId = 'whisper-base';
export const DEFAULT_WHISPER_MODEL_WEIGHTS_FORMAT: WhisperModelWeightsFormat = 'q5_1';

const WHISPER_MODEL_WEIGHTS_SIZES_MB: Record<
  WhisperModelWeightsFormat,
  Record<WhisperModelId, number>
> = {
  q5_1: {
    'whisper-tiny': 31,
    'whisper-base': 57,
    'whisper-small': 182,
    'whisper-medium': 1500,
  },
  full: {
    'whisper-tiny': 75,
    'whisper-base': 145,
    'whisper-small': 466,
    'whisper-medium': 1500,
  },
};

/** iOS Core ML encoder zip sizes (Hugging Face `*-encoder.mlmodelc.zip`, rounded up). */
const WHISPER_COREML_ENCODER_SIZES_MB: Record<WhisperModelId, number> = {
  'whisper-tiny': 15,
  'whisper-base': 37,
  'whisper-small': 156,
  'whisper-medium': 542,
};

/** Weights-only size (ggml `.bin`). */
export const getWhisperModelSizeMb = (
  modelId: WhisperModelId,
  format: WhisperModelWeightsFormat,
): number => WHISPER_MODEL_WEIGHTS_SIZES_MB[format][modelId];

export const getWhisperCoreMlSizeMb = (modelId: WhisperModelId): number =>
  WHISPER_COREML_ENCODER_SIZES_MB[modelId];

/** Estimated download size: weights + Core ML on iOS when encoder is not on disk yet. */
export const getWhisperEstimatedDownloadSizeMb = (
  modelId: WhisperModelId,
  format: WhisperModelWeightsFormat,
  options?: { coreMlAlreadyInstalled?: boolean },
): number => {
  const weightsMb = getWhisperModelSizeMb(modelId, format);
  if (!IS_IOS || options?.coreMlAlreadyInstalled) {
    return weightsMb;
  }
  return weightsMb + getWhisperCoreMlSizeMb(modelId);
};

export const getWhisperModelVariantId = (
  modelId: WhisperModelId,
  format: WhisperModelWeightsFormat,
): WhisperModelVariantId => `${modelId}:${format}`;

export const getWhisperModelDisplayName = (
  modelId: WhisperModelId,
  format: WhisperModelWeightsFormat,
): string => {
  const modelName =
    WHISPER_MODELS.find((model) => model.id === modelId)?.name ??
    modelId.replace(/^whisper-/, '').replace(/(^\w|\s\w)/g, (char) => char.toUpperCase());
  const formatLabel = format === 'q5_1' ? 'compact' : 'full';

  return `Whisper ${modelName} (${formatLabel})`;
};
