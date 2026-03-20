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

const OPENAI_MODEL: AIModel[] = [
  {
    id: 'openai/gpt-5-nano',
    name: 'GPT-5 Nano',
    provider: 'OpenAI',
    descriptionKey: 'aiModels.openaiDesc  ',
    speed: 'medium',
  },
];

const DEEPSEEK_MODEL: AIModel[] = [
  {
    id: 'deepseek/deepseek-v3.2',
    name: 'DeepSeek V3.2',
    provider: 'DeepSeek',
    descriptionKey: 'aiModels.deepSeekDesc',
    speed: 'medium',
  },
];

// FIXME: Models are not available in the API now. Will be added in Pro plan.
// const MISTRAL_MODELS: AIModel[] = [
//   {
//     id: 'mistralai/mistral-small-3.2-24b-instruct',
//     name: 'Mistral Small 3.2',
//     provider: 'Mistral',
//     descriptionKey: 'aiModels.mistralDesc',
//     speed: 'medium',
//   },
// ];

// const META_LLAMA_MODEL: AIModel = {
//   id: 'meta-llama/llama-3.3-70b-instruct',
//   name: 'Llama 3.3 70B',
//   provider: 'Meta',
//   descriptionKey: 'aiModels.metaLlamaDesc',
//   speed: 'fast',
// };

export const AI_MODELS: AIModel[] = [...GEMINI_MODELS, ...DEEPSEEK_MODEL, ...OPENAI_MODEL];

export const WHISPER_MODELS: WhisperModel[] = [
  {
    id: 'whisper-tiny',
    name: 'Tiny',
    description: 'Минимальные требования к памяти, базовое качество',
    sizeLabel: '75 MB',
    sizeMb: 75,
    accuracy: 'low',
    speed: 'fast',
    status: 'not_downloaded',
  },
  {
    id: 'whisper-base',
    name: 'Base',
    description: 'Хороший баланс между скоростью и качеством',
    sizeLabel: '145 MB',
    sizeMb: 145,
    accuracy: 'medium',
    speed: 'fast',
    status: 'not_downloaded',
  },
  {
    id: 'whisper-small',
    name: 'Small',
    description: 'Улучшенное качество для большинства языков',
    sizeLabel: '466 MB',
    sizeMb: 466,
    accuracy: 'medium',
    speed: 'medium',
    status: 'not_downloaded',
  },
  {
    id: 'whisper-medium',
    name: 'Medium',
    description: 'Высокое качество транскрипции',
    sizeLabel: '1.5 GB',
    sizeMb: 1500,
    accuracy: 'high',
    speed: 'slow',
    status: 'not_downloaded',
  },
];

export const DEFAULT_SELECTED_WHISPER_MODEL_ID: WhisperModelId = 'whisper-base';
