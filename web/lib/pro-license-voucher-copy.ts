import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ProLicenseDurationSpec } from '@/lib/pro-license-admin';

export type VoucherLocale = 'en' | 'ru';

export function parseVoucherLocale(raw: unknown): VoucherLocale {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  return s === 'ru' ? 'ru' : 'en';
}

export type VoucherSidebarPerkIcon = 'zap' | 'brain' | 'shield';

export type VoucherPdfCopy = {
  titleLine: string;
  yourCode: string;
  thankYouSidebar: string;
  thanksLead: string;
  sidebarTagline: string;
  sidebarPerks: [string, string, string];
  sidebarPerkIcons: [VoucherSidebarPerkIcon, VoucherSidebarPerkIcon, VoucherSidebarPerkIcon];
  cutAlongOuterLine: string;
  premiumHeadline: string;
  stepTitles: [string, string, string];
  stepDetails: [string, string, string];
  footerLegal: string;
  foldTitle: string;
  foldSteps: [string, string, string];
  belowStripLegalTitle: string;
};

/** Bump when below-strip, envelope, or voucher legal copy changes (printed on every PDF). */
export const VOUCHER_TEMPLATE_VERSION = 'v22';

export type VoucherEnvelopeCopy = {
  pageTitle: string;
  cutAlongOuterLine: string;
  foldLineLabel: string;
  cutLineLabel: string;
  scissorsLabel: string;
  stepOrderLabel: string;
  topFlapHeadline: string;
  topFlapHint: string;
  frontTagline: string;
  foldInLabel: string;
  foldUpLabel: string;
  foldDownLabel: string;
  slotLabel: string;
  assemblyTitle: string;
  assemblySteps: [string, string, string, string, string];
  previewTitle: string;
  previewCaption: string;
  pocketFitNote: string;
};

export type VoucherBelowStripLegalOpts = {
  site: string;
  supportEmail: string;
  year: number;
  duration: ProLicenseDurationSpec;
  issuedAt: string;
  batchId: string;
  templateVersion: string;
};

const EN_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export function formatVoucherIssuedDateLabel(isoDate: string, locale: VoucherLocale): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) return locale === 'ru' ? 'Дата выпуска: —' : 'Issued: —';
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (locale === 'ru') {
    return `Дата выпуска: ${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
  }
  const monthName = EN_MONTHS[month - 1] ?? '—';
  return `Issued: ${day} ${monthName} ${year}`;
}

export function formatVoucherBatchIdLabel(batchId: string, locale: VoucherLocale): string {
  const id = batchId.trim() || '—';
  return locale === 'ru' ? `ID партии: ${id}` : `Batch ID: ${id}`;
}

export function formatVoucherTemplateVersionLabel(version: string, locale: VoucherLocale): string {
  const v = version.trim() || VOUCHER_TEMPLATE_VERSION;
  return locale === 'ru'
    ? `Шаблон документа: Voucher Template ${v}`
    : `Document: Voucher Template ${v}`;
}

/** PRO period starts at redemption, not print date. */
export function formatVoucherProFromActivationLine(
  duration: ProLicenseDurationSpec,
  locale: VoucherLocale,
): string {
  if (locale === 'ru') {
    if (duration.kind === 'days') {
      if (duration.days === 1) {
        return '1 день PRO-доступа начинается с момента активации кода, а не с даты печати ваучера.';
      }
      const word = duration.days >= 5 ? 'дней' : 'дня';
      return `${duration.days} ${word} PRO-доступа начинаются с момента активации кода, а не с даты печати ваучера.`;
    }
    if (duration.months === 1) {
      return '1 месяц PRO-доступа начинается с момента активации кода, а не с даты печати ваучера.';
    }
    const mod10 = duration.months % 10;
    const mod100 = duration.months % 100;
    const word = mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'месяца' : 'месяцев';
    return `${duration.months} ${word} PRO-доступа начинаются с момента активации кода, а не с даты печати ваучера.`;
  }

  if (duration.kind === 'days') {
    if (duration.days === 1) {
      return '1 day of PRO access begins when the code is redeemed, not when this voucher is printed.';
    }
    return `${duration.days} days of PRO access begin when the code is redeemed, not when this voucher is printed.`;
  }
  if (duration.months === 1) {
    return '1 month of PRO access begins when the code is redeemed, not when this voucher is printed.';
  }
  return `${duration.months} months of PRO access begin when the code is redeemed, not when this voucher is printed.`;
}

function formatVoucherActivationHelpLine(
  locale: VoucherLocale,
  site: string,
  supportEmail: string,
): string {
  const email = supportEmail.trim();
  if (locale === 'ru') {
    if (email) {
      return `Не получается активировать? Напишите на ${email}, укажите код ваучера и ID партии ниже.`;
    }
    return `Не получается активировать? Обратитесь в поддержку через сайт ${site} и укажите код ваучера и ID партии ниже.`;
  }
  if (email) {
    return `Cannot activate? Email ${email} with your voucher code and Batch ID below.`;
  }
  return `Cannot activate? Contact support via ${site} with your voucher code and Batch ID below.`;
}

/** Fine print below the cut line (not printed on the voucher itself). */
export function getVoucherBelowStripLegalLines(
  locale: VoucherLocale,
  opts: VoucherBelowStripLegalOpts,
): string[] {
  const privacy = `${opts.site.replace(/\/$/, '')}/privacy`;
  const terms = `${opts.site.replace(/\/$/, '')}/terms`;
  const supportLine =
    opts.supportEmail.trim().length > 0
      ? locale === 'ru'
        ? `Поддержка: ${opts.supportEmail.trim()}`
        : `Support: ${opts.supportEmail.trim()}`
      : null;

  const meta = [
    formatVoucherIssuedDateLabel(opts.issuedAt, locale),
    formatVoucherBatchIdLabel(opts.batchId, locale),
    formatVoucherTemplateVersionLabel(opts.templateVersion, locale),
    formatVoucherProFromActivationLine(opts.duration, locale),
  ];

  const activationHelp = formatVoucherActivationHelpLine(locale, opts.site, opts.supportEmail);

  if (locale === 'ru') {
    return [
      ...meta,
      'Подарочный ваучер предоставляет указанный срок PRO-доступа в приложении Voice Inbox AI после активации кода. Один код — один получатель; не обменивается на деньги, не передаётся третьим лицам.',
      activationHelp,
      'Активируя код, вы соглашаетесь с Условиями использования и Политикой конфиденциальности Voice Inbox AI.',
      `Политика конфиденциальности: ${privacy} · Условия: ${terms}`,
      ...(supportLine ? [supportLine] : []),
      `© ${opts.year} Voice Inbox AI. Все права защищены.`,
    ];
  }

  return [
    ...meta,
    'This gift voucher grants the stated PRO access in the Voice Inbox AI app when the code is redeemed. One code per recipient; no cash value; not transferable.',
    activationHelp,
    'By redeeming this code you agree to the Voice Inbox AI Terms of Service and Privacy Policy.',
    `Privacy Policy: ${privacy} · Terms of Service: ${terms}`,
    ...(supportLine ? [supportLine] : []),
    `© ${opts.year} Voice Inbox AI. All rights reserved.`,
  ];
}

const COPY_EN: VoucherPdfCopy = {
  titleLine: 'GIFT VOUCHER',
  yourCode: 'YOUR CODE',
  thankYouSidebar: 'Thank you for choosing Voice Inbox AI',
  thanksLead: 'Thank you for choosing',
  sidebarTagline: 'From thought to clarity.',
  sidebarPerks: [
    'AI without extra taps',
    'Your AI server & customization',
    'GitHub & GitLab backup & sync',
  ],
  sidebarPerkIcons: ['zap', 'brain', 'shield'],
  cutAlongOuterLine: 'CUT ALONG SOLID LINE',
  premiumHeadline: '',
  stepTitles: ['OPEN THE APP', 'OPEN CODE ENTRY', 'REDEEM YOUR CODE'],
  stepDetails: [
    'Scan the QR code to install or open the app.',
    'Settings → About. Tap the app icon 8 times quickly.',
    'Enter your code below and tap Apply.',
  ],
  footerLegal: 'VALID FOR ONE-TIME USE ONLY • NON-TRANSFERABLE',
  foldTitle: 'HOW TO FOLD',
  foldSteps: [
    '1. Cut along the outer solid line.',
    '2. Fold the right half over the left along the dashed center line.',
    '3. When closed, your code is hidden inside — open the card to redeem.',
  ],
  belowStripLegalTitle: 'TERMS & INFORMATION',
};

const COPY_RU: VoucherPdfCopy = {
  titleLine: 'ПОДАРОЧНЫЙ ВАУЧЕР',
  yourCode: 'ВАШ КОД',
  thankYouSidebar: 'Спасибо, что выбрали Voice Inbox AI',
  thanksLead: 'Спасибо, что выбрали',
  sidebarTagline: 'От мысли — к ясности.',
  sidebarPerks: [
    'ИИ без лишних нажатий',
    'Свой ИИ-сервер и кастомизация',
    'Синхронизация с GitHub и GitLab',
  ],
  sidebarPerkIcons: ['zap', 'brain', 'shield'],
  cutAlongOuterLine: 'РЕЖЬТЕ ПО СПЛОШНОЙ ЛИНИИ',
  premiumHeadline: '',
  stepTitles: ['ОТКРОЙТЕ ПРИЛОЖЕНИЕ', 'ОТКРОЙТЕ ВВОД КОДА', 'АКТИВИРУЙТЕ КОД'],
  stepDetails: [
    'Отсканируйте QR-код — установите или откройте приложение.',
    'Настройки → О приложении. 8 быстрых нажатий на иконку.',
    'Введите код ниже и нажмите «Применить».',
  ],
  footerLegal: 'ТОЛЬКО ДЛЯ ОДНОКРАТНОГО ИСПОЛЬЗОВАНИЯ • НЕ ПЕРЕДАЁТСЯ',
  foldTitle: 'КАК СЛОЖИТЬ',
  foldSteps: [
    '1. Вырежьте по внешней сплошной линии.',
    '2. Сложите правую половину на левую по пунктирной линии посередине.',
    '3. В сложенном виде код скрыт внутри — разверните карточку, чтобы активировать.',
  ],
  belowStripLegalTitle: 'УСЛОВИЯ И СВЕДЕНИЯ',
};

export function getVoucherPdfCopy(locale: VoucherLocale): VoucherPdfCopy {
  const base = locale === 'ru' ? COPY_RU : COPY_EN;
  return { ...base };
}

const ENVELOPE_COPY_EN: VoucherEnvelopeCopy = {
  pageTitle: 'BRANDED GIFT ENVELOPE — ASSEMBLY SHEET',
  cutAlongOuterLine: 'CUT ALONG SOLID LINE',
  foldLineLabel: 'FOLD LINE',
  cutLineLabel: 'CUT LINE',
  scissorsLabel: 'CUT',
  stepOrderLabel: 'STEP',
  topFlapHeadline: 'YOUR GIFT IS INSIDE!',
  topFlapHint: 'Fold down and tuck the tab into the slot.',
  frontTagline: 'Gift voucher enclosed',
  foldInLabel: 'FOLD IN',
  foldUpLabel: 'FOLD UP',
  foldDownLabel: 'FOLD DOWN',
  slotLabel: 'SLOT',
  assemblyTitle: 'HOW TO ASSEMBLE THE ENVELOPE',
  assemblySteps: [
    '1. Cut along the outer solid line. Cut the small slot on the front panel (scissors mark).',
    '2. Fold the left and right side flaps inward along the dashed lines.',
    '3. Fold the bottom flap up over the sides.',
    '4. Slide the folded voucher into the pocket.',
    '5. Fold the top flap down and insert the tab into the slot — no glue needed.',
  ],
  previewTitle: 'FINISHED ENVELOPE',
  previewCaption: 'Secure closure without glue',
  pocketFitNote: 'Pocket sized for the folded voucher from page 1.',
};

const ENVELOPE_COPY_RU: VoucherEnvelopeCopy = {
  pageTitle: 'БРЕНДИРОВАННЫЙ ПОДАРОЧНЫЙ КОНВЕРТ — СБОРКА',
  cutAlongOuterLine: 'РЕЖЬТЕ ПО СПЛОШНОЙ ЛИНИИ',
  foldLineLabel: 'ЛИНИЯ СГИБА',
  cutLineLabel: 'ЛИНИЯ РЕЗА',
  scissorsLabel: 'ВЫРЕЗАТЬ',
  stepOrderLabel: 'ШАГ',
  topFlapHeadline: 'ВАШ ПОДАРОК ВНУТРИ!',
  topFlapHint: 'Опустите клапан и вставьте язычок в прорезь.',
  frontTagline: 'Подарочный ваучер внутри',
  foldInLabel: 'СОГНИТЕ',
  foldUpLabel: 'СОГНИТЕ ВВЕРХ',
  foldDownLabel: 'СОГНИТЕ ВНИЗ',
  slotLabel: 'ПРОРЕЗЬ',
  assemblyTitle: 'КАК СОБРАТЬ КОНВЕРТ',
  assemblySteps: [
    '1. Вырежьте по внешнему сплошному контуру. Сделайте прорезь на передней панели (метка с ножницами).',
    '2. Согните боковые клапаны внутрь по пунктирным линиям.',
    '3. Поднимите нижний клапан вверх поверх боковых.',
    '4. Вложите сложенный ваучер со страницы 1 в карман.',
    '5. Опустите верхний клапан и вставьте язычок в прорезь — клей не нужен.',
  ],
  previewTitle: 'ГОТОВЫЙ КОНВЕРТ',
  previewCaption: 'Надёжная фиксация без клея',
  pocketFitNote: 'Карман рассчитан на сложенный ваучер со страницы 1.',
};

export function getVoucherEnvelopeCopy(locale: VoucherLocale): VoucherEnvelopeCopy {
  return locale === 'ru' ? ENVELOPE_COPY_RU : ENVELOPE_COPY_EN;
}

/** Headline for the voucher sidebar (e.g. "14 DAYS PRO ACCESS"). */
export function formatVoucherPremiumAccessHeadline(
  duration: ProLicenseDurationSpec,
  locale: VoucherLocale,
): string {
  if (locale === 'ru') {
    if (duration.kind === 'days') {
      if (duration.days === 1) return '1 ДЕНЬ\nPRO ДОСТУП';
      return `${duration.days} ${duration.days >= 5 ? 'ДНЕЙ' : 'ДНЯ'}\nPRO ДОСТУП`;
    }
    if (duration.months === 1) return '1 МЕСЯЦ\nPRO ДОСТУП';
    const mod10 = duration.months % 10;
    const mod100 = duration.months % 100;
    const word = mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'МЕСЯЦА' : 'МЕСЯЦЕВ';
    return `${duration.months} ${word}\nPRO ДОСТУП`;
  }

  if (duration.kind === 'days') {
    if (duration.days === 1) return '1 DAY\nPRO ACCESS';
    return `${duration.days} DAYS\nPRO ACCESS`;
  }
  if (duration.months === 1) return '1 MONTH\nPRO ACCESS';
  return `${duration.months} MONTHS\nPRO ACCESS`;
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
