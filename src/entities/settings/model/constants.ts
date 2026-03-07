import type { AIModel, WhisperModel } from './types';

export const AI_MODELS: AIModel[] = [
  {
    id: 'google/gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    provider: 'Google',
    description: 'Быстрая и эффективная модель для повседневных задач',
    contextWindow: '1M токенов',
    speed: 'fast',
  },
];

export const WHISPER_MODELS: WhisperModel[] = [
  {
    id: 'whisper-tiny',
    name: 'Tiny',
    description: 'Минимальные требования к памяти, базовое качество',
    sizeLabel: '75 МБ',
    sizeMb: 75,
    accuracy: 'low',
    speed: 'fast',
    status: 'not_downloaded',
  },
  {
    id: 'whisper-base',
    name: 'Base',
    description: 'Хороший баланс между скоростью и качеством',
    sizeLabel: '145 МБ',
    sizeMb: 145,
    accuracy: 'medium',
    speed: 'fast',
    status: 'not_downloaded',
  },
  {
    id: 'whisper-small',
    name: 'Small',
    description: 'Улучшенное качество для большинства языков',
    sizeLabel: '466 МБ',
    sizeMb: 466,
    accuracy: 'medium',
    speed: 'medium',
    status: 'not_downloaded',
  },
  {
    id: 'whisper-medium',
    name: 'Medium',
    description: 'Высокое качество транскрипции',
    sizeLabel: '1.5 ГБ',
    sizeMb: 1500,
    accuracy: 'high',
    speed: 'slow',
    status: 'not_downloaded',
  },
  {
    id: 'whisper-large-v3',
    name: 'Large v3',
    description: 'Максимальное качество, поддержка 99 языков',
    sizeLabel: '3.1 ГБ',
    sizeMb: 3100,
    accuracy: 'very_high',
    speed: 'very_slow',
    status: 'not_downloaded',
  },
];
