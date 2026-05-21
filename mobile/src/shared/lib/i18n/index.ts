import 'dayjs/locale/ru';

import dayjs from 'dayjs';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { storage } from '@/shared/lib/async-storage';
import { resolveDayjsLocale } from '@/shared/lib/date';

import { DEFAULT_LOCALE, LOCALE_MAP, SUPPORTED_LOCALES } from './config';
import en from './locales/en.json';
import ru from './locales/ru.json';

const resources = {
  en: { translation: en },
  ru: { translation: ru },
};

const APP_LANGUAGE_KEY = 'settings.appLanguage';

type AppLanguage = 'system' | 'en' | 'ru';

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
    if (__DEV__) {
      console.warn('react-native-localize not available or bridge not ready');
    }
  }
  return DEFAULT_LOCALE;
}

function getEffectiveLocale(): string {
  const stored = storage.getString(APP_LANGUAGE_KEY) as AppLanguage | undefined;
  if (stored === 'en' || stored === 'ru') return stored;
  return getDeviceLocale();
}

function schedulePushLocaleSync(): void {
  void import('@/shared/lib/push/requestPermissionAndRegister')
    .then((mod) => mod.syncPushLocaleRegistration())
    .catch(() => {});
}

export function applyAppLanguage(): void {
  const locale = getEffectiveLocale();
  dayjs.locale(resolveDayjsLocale(locale));
  const languageChanged = i18n.language !== locale;
  if (languageChanged) {
    i18n.changeLanguage(locale);
    schedulePushLocaleSync();
  }
}

export function initI18n(): void {
  i18n.use(initReactI18next).init({
    resources,
    lng: DEFAULT_LOCALE,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: SUPPORTED_LOCALES,
    interpolation: {
      escapeValue: false,
    },
  });
  dayjs.locale(resolveDayjsLocale(DEFAULT_LOCALE));

  setImmediate(() => {
    try {
      applyAppLanguage();
    } catch {
      if (__DEV__) {
        console.warn('Failed to apply app language');
      }
    }
  });
}

export { i18n };
export type { SupportedLocale } from './config';
