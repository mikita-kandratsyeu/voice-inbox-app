import { i18n } from '@/shared/lib/i18n';

function intlLocaleForIapPrices(): string {
  const raw = (i18n.language ?? 'en').toLowerCase();

  if (raw.startsWith('ru')) return 'ru-RU';

  return 'en-US';
}

function formatIapCurrencyAmount(amount: number, currencyCode: string): string | null {
  const code = (currencyCode ?? '').trim().toUpperCase();
  if (!code || !Number.isFinite(amount)) {
    return null;
  }
  try {
    return new Intl.NumberFormat(intlLocaleForIapPrices(), {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    }).format(amount);
  } catch {
    return null;
  }
}

const PRICE_NUMBER_PATTERN = /(\d[\d.,\s\u00a0\u202f]*\d|\d+)/;

function findPriceNumberSpan(
  priceString: string,
): { start: number; end: number; text: string } | null {
  const match = priceString.match(PRICE_NUMBER_PATTERN);
  if (!match || match.index == null) {
    return null;
  }

  return {
    start: match.index,
    end: match.index + match[0].length,
    text: match[0],
  };
}

function resolveGroupingSeparator(
  core: string,
  compactCore: string,
  decimalSep: ',' | '.' | null,
): string | null {
  if (decimalSep != null) {
    const intPartRaw = core.split(decimalSep)[0] ?? core;
    if (/[\s\u00a0\u202f]/.test(intPartRaw) && /\d[\s\u00a0\u202f]\d{3}/.test(intPartRaw)) {
      return ' ';
    }
  }

  if (decimalSep === ',') {
    return compactCore.includes('.') ? '.' : '.';
  }
  if (decimalSep === '.') {
    return compactCore.includes(',') ? ',' : ',';
  }
  return null;
}

function formatAmountLikeTemplate(amount: number, template: string): string {
  const leading = template.match(/^[\s\u00a0\u202f]*/)?.[0] ?? '';
  const trailing = template.match(/[\s\u00a0\u202f]*$/)?.[0] ?? '';
  const core = template.slice(leading.length, template.length - trailing.length || undefined);
  const compactCore = core.replace(/[\s\u00a0\u202f]/g, '');

  const lastComma = compactCore.lastIndexOf(',');
  const lastDot = compactCore.lastIndexOf('.');

  let decimalSep: ',' | '.' | null = null;
  if (lastComma >= 0 && lastDot >= 0) {
    decimalSep = lastComma > lastDot ? ',' : '.';
  } else if (lastComma >= 0) {
    decimalSep = ',';
  } else if (lastDot >= 0) {
    decimalSep = '.';
  }

  const groupingSep = resolveGroupingSeparator(core, compactCore, decimalSep);

  let fractionDigits = 0;
  if (decimalSep != null) {
    const fractionPart = compactCore.split(decimalSep)[1] ?? '';
    fractionDigits = fractionPart.replace(/\D/g, '').length;
  }

  const templateHasGrouping =
    groupingSep != null &&
    (groupingSep === ' ' ? /[\s\u00a0\u202f]/.test(core) : compactCore.includes(groupingSep));
  const rounded = fractionDigits > 0 ? amount.toFixed(fractionDigits) : String(Math.round(amount));
  const [intPart, fracPart = ''] = rounded.split('.');

  let intFormatted = intPart;
  if (groupingSep != null && intPart.length > 3 && (templateHasGrouping || decimalSep != null)) {
    intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, groupingSep);
  }

  const formattedCore =
    decimalSep != null && fractionDigits > 0
      ? `${intFormatted}${decimalSep}${fracPart}`
      : intFormatted;

  return leading + formattedCore + trailing;
}

/** Format a computed amount using the same separators/symbol layout as a store price string. */
export function formatIapAmountLikeStorePrice(
  storePriceString: string,
  targetAmount: number,
): string | null {
  if (!Number.isFinite(targetAmount)) {
    return null;
  }

  const ref = storePriceString.trim();
  if (!ref) {
    return null;
  }

  const span = findPriceNumberSpan(ref);
  if (!span) {
    return null;
  }

  const formattedNum = formatAmountLikeTemplate(targetAmount, span.text);
  return ref.slice(0, span.start) + formattedNum + ref.slice(span.end);
}

/** Prefer the store-localized price string; format only when the store omits one. */
export function resolveIapPriceString(
  storePriceString: string | null | undefined,
  amount: number,
  currencyCode: string,
): string | null {
  const raw = storePriceString?.trim();
  if (raw) {
    return raw;
  }

  return formatIapCurrencyAmount(amount, currencyCode);
}

/** Scale a store price layout to another amount (e.g. monthly × 12 for compare-at). */
export function resolveScaledIapPriceString(
  referencePriceString: string | null | undefined,
  targetAmount: number,
  currencyCode: string,
  layoutReferencePriceString?: string | null | undefined,
): string | null {
  for (const candidate of [layoutReferencePriceString, referencePriceString]) {
    const raw = candidate?.trim();
    if (!raw) {
      continue;
    }
    const scaled = formatIapAmountLikeStorePrice(raw, targetAmount);
    if (scaled) {
      return scaled;
    }
  }

  return formatIapCurrencyAmount(targetAmount, currencyCode);
}

/**
 * Format a derived amount (e.g. annual price per month) using the main store price layout.
 */
export function resolveDerivedIapPriceString(
  layoutReferencePriceString: string | null | undefined,
  amount: number,
  storePriceString: string | null | undefined,
  currencyCode: string,
): string | null {
  const layoutRef = layoutReferencePriceString?.trim();
  if (layoutRef) {
    const derived = formatIapAmountLikeStorePrice(layoutRef, amount);
    if (derived) {
      return derived;
    }
  }

  return resolveIapPriceString(storePriceString, amount, currencyCode);
}
