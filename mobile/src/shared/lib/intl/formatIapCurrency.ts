import { formatIapAmountLikeFirstStorePrice } from './formatIapFromStoreTemplate';
import {
  getIapFormatLocale,
  IAP_CURRENCY_LOCALE,
  normalizeIapCurrencyCode,
} from './iapCurrencyLocales';

export type FormatIapCurrencyOptions = {
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

/** Store priceString sometimes uses ISO code prefix (e.g. "USD 5.99") instead of a symbol. */
export function storePriceStringHasIsoCode(priceString: string, currencyCode: string): boolean {
  const code = normalizeIapCurrencyCode(currencyCode);
  if (!code) {
    return false;
  }
  return new RegExp(`\\b${code}\\b`, 'i').test(priceString);
}

function pickSymbolLayoutReferences(
  currencyCode: string,
  ...candidates: Array<string | null | undefined>
): string[] {
  const layouts: string[] = [];
  for (const candidate of candidates) {
    const raw = candidate?.trim();
    if (!raw || storePriceStringHasIsoCode(raw, currencyCode)) {
      continue;
    }
    layouts.push(raw);
  }
  return layouts;
}

/** Format a monetary amount for IAP UI using Intl (FormatJS polyfill on device). */
export function formatIapCurrency(
  amount: number,
  currencyCode: string,
  options?: FormatIapCurrencyOptions,
): string | null {
  if (!Number.isFinite(amount)) {
    return null;
  }

  const code = normalizeIapCurrencyCode(currencyCode);
  if (!code) {
    return null;
  }

  const locale = options?.locale ?? getIapFormatLocale(code);

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      ...(options?.minimumFractionDigits != null
        ? { minimumFractionDigits: options.minimumFractionDigits }
        : {}),
      ...(options?.maximumFractionDigits != null
        ? { maximumFractionDigits: options.maximumFractionDigits }
        : {}),
    }).format(amount);
  } catch {
    return null;
  }
}

/** Prefer the store-localized price string; reformat when it uses an ISO code instead of a symbol. */
export function resolveIapPriceString(
  storePriceString: string | null | undefined,
  amount: number,
  currencyCode: string,
  symbolLayoutReference?: string | null | undefined,
): string | null {
  const raw = storePriceString?.trim();
  if (raw && !storePriceStringHasIsoCode(raw, currencyCode)) {
    return raw;
  }

  const fromLayout = formatIapAmountLikeFirstStorePrice(
    pickSymbolLayoutReferences(currencyCode, symbolLayoutReference),
    amount,
  );
  if (fromLayout) {
    return fromLayout;
  }

  return formatIapCurrency(amount, currencyCode);
}

/** Format compare-at (e.g. monthly × 12) using a store layout, then Intl. */
export function resolveScaledIapPriceString(
  referencePriceString: string | null | undefined,
  targetAmount: number,
  currencyCode: string,
  layoutReferencePriceString?: string | null | undefined,
  symbolLayoutReference?: string | null | undefined,
): string | null {
  const fromStore = formatIapAmountLikeFirstStorePrice(
    pickSymbolLayoutReferences(
      currencyCode,
      symbolLayoutReference,
      layoutReferencePriceString,
      referencePriceString,
    ),
    targetAmount,
  );
  if (fromStore) {
    return fromStore;
  }

  return formatIapCurrency(targetAmount, currencyCode);
}

/**
 * Format a derived per-period amount (e.g. annual price per month) using the main store layout.
 */
export function resolveDerivedIapPriceString(
  layoutReferencePriceString: string | null | undefined,
  amount: number,
  symbolLayoutReference: string | null | undefined,
  currencyCode: string,
): string | null {
  const fromLayout = formatIapAmountLikeFirstStorePrice(
    pickSymbolLayoutReferences(currencyCode, symbolLayoutReference, layoutReferencePriceString),
    amount,
  );
  if (fromLayout) {
    return fromLayout;
  }

  return formatIapCurrency(amount, currencyCode);
}

export { getIapFormatLocale, IAP_CURRENCY_LOCALE, normalizeIapCurrencyCode };
