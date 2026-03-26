import type { AIModel, UserFacingAIModel, WhisperModel, WhisperModelId } from './types';

export const USER_FACING_AI_MODELS: UserFacingAIModel[] = [
  {
    id: 'google/gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    provider: 'Google',
    descriptionKey: 'aiModels.geminiDesc2_5',
    speed: 'fast',
    tierLabelKey: 'aiModels.tierFast',
    supportTierCode: 'fast',
  },
  {
    id: 'google/gemini-3.1-flash-lite-preview',
    name: 'Gemini 3.1 Flash Lite',
    provider: 'Google',
    descriptionKey: 'aiModels.geminiDesc3_1',
    speed: 'fast',
    tierLabelKey: 'aiModels.tierSmart',
    supportTierCode: 'smarter',
  },
  {
    id: 'minimax/minimax-m2.7',
    name: 'MiniMax M2.7',
    provider: 'MiniMax',
    descriptionKey: 'aiModels.minimaxDesc',
    speed: 'fast',
    tierLabelKey: 'aiModels.tierPremium',
    supportTierCode: 'premium_experimental',
  },
];

export const AI_MODELS: AIModel[] = USER_FACING_AI_MODELS.map(
  ({ tierLabelKey: _t, supportTierCode: _s, ...m }) => m,
);

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
