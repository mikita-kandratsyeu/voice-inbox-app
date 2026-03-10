export const SUPPORTED_LOCALES = ['en', 'ru'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en';

export const LOCALE_MAP: Record<string, SupportedLocale> = {
  en: 'en',
  'en-US': 'en',
  'en-GB': 'en',
  ru: 'ru',
  'ru-RU': 'ru',
  'ru-BY': 'ru',
  'ru-KZ': 'ru',
};
