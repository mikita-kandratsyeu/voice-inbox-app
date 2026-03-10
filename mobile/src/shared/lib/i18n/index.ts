import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LOCALE, LOCALE_MAP, SUPPORTED_LOCALES } from './config';
import en from './locales/en.json';
import ru from './locales/ru.json';

const resources = {
  en: { translation: en },
  ru: { translation: ru },
};

// Lazily called only inside setImmediate, when the native bridge is ready.
function getDeviceLocale(): string {
  try {
    const { getLocales } = require('react-native-localize') as {
      getLocales: () => Array<{ languageTag: string; languageCode: string }>;
    };
    const locales = getLocales();
    const primary = locales?.[0]?.languageTag ?? locales?.[0]?.languageCode;
    if (primary) {
      const tag = primary.split('-')[0]?.toLowerCase() ?? primary.toLowerCase();
      return LOCALE_MAP[primary] ?? LOCALE_MAP[tag] ?? DEFAULT_LOCALE;
    }
  } catch {
    // react-native-localize not available or bridge not ready
  }
  return DEFAULT_LOCALE;
}

export function initI18n(): void {
  // Initialize synchronously with the default locale — no native calls here.
  i18n.use(initReactI18next).init({
    resources,
    lng: DEFAULT_LOCALE,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: SUPPORTED_LOCALES,
    interpolation: {
      escapeValue: false,
    },
  });

  // Detect the device locale after the bridge is ready and switch if needed.
  setImmediate(() => {
    try {
      const detected = getDeviceLocale();
      if (detected !== DEFAULT_LOCALE && i18n.language !== detected) {
        i18n.changeLanguage(detected);
      }
    } catch {
      // keep default locale
    }
  });
}

export { i18n };
export type { SupportedLocale } from './config';
