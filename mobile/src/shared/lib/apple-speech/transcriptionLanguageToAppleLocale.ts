import * as RNLocalize from 'react-native-localize';

import type { TranscriptionLanguage } from '@/entities/settings';

const LANGUAGE_TO_LOCALE: Record<Exclude<TranscriptionLanguage, 'auto'>, string> = {
  ru: 'ru-RU',
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  zh: 'zh-CN',
  ja: 'ja-JP',
};

export function transcriptionLanguageToAppleLocale(language: TranscriptionLanguage): string {
  if (language !== 'auto') {
    return LANGUAGE_TO_LOCALE[language];
  }

  const tag = RNLocalize.getLocales()[0]?.languageTag;
  if (tag && tag.length > 0) {
    return tag;
  }

  return 'en-US';
}
