import type { TranscriptionLanguage } from '@/entities/settings';

export const TRANSCRIPTION_LANGUAGES: TranscriptionLanguage[] = [
  'auto',
  'ru',
  'en',
  'de',
  'fr',
  'es',
  'zh',
  'ja',
];

export const TRANSLATE_LANGUAGES = TRANSCRIPTION_LANGUAGES.filter(
  (l): l is Exclude<TranscriptionLanguage, 'auto'> => l !== 'auto',
);
