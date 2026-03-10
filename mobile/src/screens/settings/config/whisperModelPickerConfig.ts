import { i18n } from '@/shared/lib';

export const getAccuracyLabel = (key: string): string =>
  i18n.t(`whisper.accuracy.${key}` as 'whisper.accuracy.low');

export const getSpeedLabel = (key: string): string =>
  i18n.t(`whisper.speed.${key}` as 'whisper.speed.fast');

export const RECOMMENDED_MODEL_ID = 'whisper-base';
