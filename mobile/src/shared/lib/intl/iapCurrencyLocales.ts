import { getLocales } from 'react-native-localize';

/** Default BCP-47 locale per ISO 4217 currency (App Store / Play regions). */
export const IAP_CURRENCY_LOCALE: Record<string, string> = {
  AED: 'ar-AE',
  ARS: 'es-AR',
  AUD: 'en-AU',
  BRL: 'pt-BR',
  CAD: 'en-CA',
  CHF: 'de-CH',
  CLP: 'es-CL',
  CNY: 'zh-CN',
  COP: 'es-CO',
  CZK: 'cs-CZ',
  DKK: 'da-DK',
  EGP: 'ar-EG',
  EUR: 'de-DE',
  GBP: 'en-GB',
  HKD: 'zh-HK',
  HUF: 'hu-HU',
  IDR: 'id-ID',
  ILS: 'he-IL',
  INR: 'en-IN',
  JPY: 'ja-JP',
  KRW: 'ko-KR',
  MXN: 'es-MX',
  MYR: 'ms-MY',
  NGN: 'en-NG',
  NOK: 'nb-NO',
  NZD: 'en-NZ',
  PHP: 'en-PH',
  PLN: 'pl-PL',
  RON: 'ro-RO',
  RUB: 'ru-RU',
  SAR: 'ar-SA',
  SEK: 'sv-SE',
  SGD: 'en-SG',
  THB: 'th-TH',
  TRY: 'tr-TR',
  TWD: 'zh-TW',
  UAH: 'uk-UA',
  USD: 'en-US',
  VND: 'vi-VN',
  ZAR: 'en-ZA',
};

export function normalizeIapCurrencyCode(currencyCode: string | null | undefined): string | null {
  const code = (currencyCode ?? '').trim().toUpperCase();
  if (!code || !/^[A-Z]{3}$/.test(code)) {
    return null;
  }
  return code;
}

function getDeviceLocaleTag(): string | null {
  try {
    const locales = getLocales();
    const tag = locales?.[0]?.languageTag ?? locales?.[0]?.languageCode;
    return tag?.trim() ? tag : null;
  } catch {
    return null;
  }
}

export function localeFormatsCurrencyWithSymbol(locale: string, currencyCode: string): boolean {
  try {
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'narrowSymbol',
    }).format(9.99);
    return !new RegExp(`\\b${currencyCode}\\b`, 'i').test(formatted);
  } catch {
    return false;
  }
}

/** Store region locale first, then device; both must yield a symbol (not ISO code). */
export function getIapFormatLocale(currencyCode: string): string {
  const code = normalizeIapCurrencyCode(currencyCode);
  if (!code) {
    return 'en-US';
  }

  const mapped = IAP_CURRENCY_LOCALE[code];
  if (mapped && localeFormatsCurrencyWithSymbol(mapped, code)) {
    return mapped;
  }

  if (mapped) {
    const base = mapped.split('-')[0];
    if (base && localeFormatsCurrencyWithSymbol(base, code)) {
      return base;
    }
  }

  const deviceTag = getDeviceLocaleTag();
  if (deviceTag && localeFormatsCurrencyWithSymbol(deviceTag, code)) {
    return deviceTag;
  }

  return 'en-US';
}
