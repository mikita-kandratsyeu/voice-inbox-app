import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ProLicenseDurationSpec } from '@/lib/pro-license-admin';

export type VoucherLocale = 'en' | 'ru';

export function parseVoucherLocale(raw: unknown): VoucherLocale {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  return s === 'ru' ? 'ru' : 'en';
}

export type VoucherPdfCopy = {
  brandName: string;
  giftVoucherTitle: string;
  scanToOpen: string;
  yourCode: string;
  thankYouSidebar: string;
  premiumHeadline: string;
  stepTitles: [string, string, string];
  stepDetails: [string, string, string];
  footerLegal: string;
};

const COPY_EN: VoucherPdfCopy = {
  brandName: 'VOICE INBOX AI',
  giftVoucherTitle: 'GIFT VOUCHER',
  scanToOpen: 'SCAN TO OPEN',
  yourCode: 'YOUR CODE',
  thankYouSidebar: 'THANK YOU FOR\nCHOOSING\nVOICE INBOX AI',
  premiumHeadline: '',
  stepTitles: ['OPEN THE APP', 'OPEN CODE ENTRY', 'REDEEM YOUR CODE'],
  stepDetails: [
    'Scan the QR code to install or open the app.',
    'In Settings, open About the app. Tap the app icon eight times quickly.',
    'Enter your voucher code and tap Apply.',
  ],
  footerLegal: 'VALID FOR ONE-TIME USE ONLY',
};

const COPY_RU: VoucherPdfCopy = {
  brandName: 'VOICE INBOX AI',
  giftVoucherTitle: 'ПОДАРОЧНЫЙ ВАУЧЕР',
  scanToOpen: 'ОТСКАНИРУЙТЕ',
  yourCode: 'ВАШ КОД',
  thankYouSidebar: 'СПАСИБО,\nЧТО ВЫБРАЛИ\nVOICE INBOX AI',
  premiumHeadline: '',
  stepTitles: ['ОТКРОЙТЕ\nПРИЛОЖЕНИЕ', 'ОТКРОЙТЕ\nВВОД КОДА', 'АКТИВИРУЙТЕ\nКОД'],
  stepDetails: [
    'Отсканируйте QR-код, чтобы установить или открыть приложение.',
    'Настройки → О приложении. Быстро нажмите на иконку приложения 8 раз подряд.',
    'Введите код с ваучера и нажмите «Применить».',
  ],
  footerLegal: 'ТОЛЬКО ДЛЯ ОДНОКРАТНОГО ИСПОЛЬЗОВАНИЯ',
};

export function getVoucherPdfCopy(locale: VoucherLocale): VoucherPdfCopy {
  const base = locale === 'ru' ? COPY_RU : COPY_EN;
  return { ...base };
}

/** Headline for the voucher sidebar (e.g. "14 DAYS PREMIUM ACCESS"). */
export function formatVoucherPremiumAccessHeadline(
  duration: ProLicenseDurationSpec,
  locale: VoucherLocale,
): string {
  if (locale === 'ru') {
    if (duration.kind === 'days') {
      if (duration.days === 1) return '1 ДЕНЬ\nПРЕМИУМ\nДОСТУП';
      return `${duration.days} ${duration.days >= 5 ? 'ДНЕЙ' : 'ДНЯ'}\nПРЕМИУМ\nДОСТУП`;
    }
    if (duration.months === 1) return '1 МЕСЯЦ\nПРЕМИУМ\nДОСТУП';
    const mod10 = duration.months % 10;
    const mod100 = duration.months % 100;
    const word = mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'МЕСЯЦА' : 'МЕСЯЦЕВ';
    return `${duration.months} ${word}\nПРЕМИУМ\nДОСТУП`;
  }

  if (duration.kind === 'days') {
    if (duration.days === 1) return '1 DAY\nPREMIUM\nACCESS';
    return `${duration.days} DAYS\nPREMIUM\nACCESS`;
  }
  if (duration.months === 1) return '1 MONTH\nPREMIUM\nACCESS';
  return `${duration.months} MONTHS\nPREMIUM\nACCESS`;
}

/** Single-line variant for filenames and metadata. */
export function formatVoucherPremiumAccessLabel(duration: ProLicenseDurationSpec): string {
  if (duration.kind === 'days') {
    if (duration.days === 1) return '1-day';
    return `${duration.days}-days`;
  }
  if (duration.months === 1) return '1-month';
  return `${duration.months}-months`;
}

let dejaVuDir: string | null = null;

/** TTF directory for Cyrillic PDF text (DejaVu Sans). */
export function getVoucherPdfDejaVuDir(): string {
  if (dejaVuDir == null) {
    const libDir = path.dirname(fileURLToPath(import.meta.url));
    dejaVuDir = path.join(libDir, '../node_modules/dejavu-fonts-ttf/ttf');
  }
  return dejaVuDir;
}
