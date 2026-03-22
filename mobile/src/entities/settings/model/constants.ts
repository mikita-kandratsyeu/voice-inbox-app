import type { AIModel, WhisperModel, WhisperModelId } from './types';

const GEMINI_MODELS: AIModel[] = [
  {
    id: 'google/gemini-3.1-flash-lite-preview',
    name: 'Gemini 3.1 Flash Lite',
    provider: 'Google',
    descriptionKey: 'aiModels.geminiDesc3_1',
    speed: 'fast',
  },
  {
    id: 'google/gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    provider: 'Google',
    descriptionKey: 'aiModels.geminiDesc2_5',
    speed: 'fast',
  },
];

const OPENAI_MODELS: AIModel[] = [
  {
    id: 'openai/gpt-5-nano',
    name: 'GPT-5 Nano',
    provider: 'OpenAI',
    descriptionKey: 'aiModels.openaiDesc',
    speed: 'medium',
  },
];

const DEEPSEEK_MODELS: AIModel[] = [
  {
    id: 'deepseek/deepseek-v3.2',
    name: 'DeepSeek V3.2',
    provider: 'DeepSeek',
    descriptionKey: 'aiModels.deepSeekDesc',
    speed: 'medium',
  },
];

const MINIMAX_MODELS: AIModel[] = [
  {
    id: 'minimax/minimax-m2.5',
    name: 'MiniMax M2.5',
    provider: 'MiniMax',
    descriptionKey: 'aiModels.minimaxDesc',
    speed: 'fast',
  },
];

export const AI_MODELS: AIModel[] = [
  ...GEMINI_MODELS,
  ...MINIMAX_MODELS,
  ...OPENAI_MODELS,
  ...DEEPSEEK_MODELS,
];

export const WHISPER_MODELS: WhisperModel[] = [
  {
    id: 'whisper-tiny',
    name: 'Tiny',
    description: 'whisper.models.tinyDesc',
    sizeLabel: '75 MB',
    sizeMb: 75,
    accuracy: 'low',
    speed: 'fast',
    status: 'not_downloaded',
  },
  {
    id: 'whisper-base',
    name: 'Base',
    description: 'whisper.models.baseDesc',
    sizeLabel: '145 MB',
    sizeMb: 145,
    accuracy: 'medium',
    speed: 'fast',
    status: 'not_downloaded',
  },
  {
    id: 'whisper-small',
    name: 'Small',
    description: 'whisper.models.smallDesc',
    sizeLabel: '466 MB',
    sizeMb: 466,
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
