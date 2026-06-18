import {
  formatIapAmountLikeFirstStorePrice,
  formatIapAmountLikeStorePrice,
} from './formatIapFromStoreTemplate';
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

/** Prefer the store-localized price string; format with Intl only when the store omits one. */
export function resolveIapPriceString(
  storePriceString: string | null | undefined,
  amount: number,
  currencyCode: string,
): string | null {
  const raw = storePriceString?.trim();
  if (raw) {
    return raw;
  }

  return formatIapCurrency(amount, currencyCode);
}

/** Format compare-at (e.g. monthly × 12) using a store layout, then Intl. */
export function resolveScaledIapPriceString(
  referencePriceString: string | null | undefined,
  targetAmount: number,
  currencyCode: string,
  layoutReferencePriceString?: string | null | undefined,
): string | null {
  const fromStore = formatIapAmountLikeFirstStorePrice(
    [layoutReferencePriceString, referencePriceString],
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
  _storePriceString: string | null | undefined,
  currencyCode: string,
): string | null {
  const layoutRef = layoutReferencePriceString?.trim();
  if (layoutRef) {
    const derived = formatIapAmountLikeStorePrice(layoutRef, amount);
    if (derived) {
      return derived;
    }
  }

  return formatIapCurrency(amount, currencyCode);
}

export { getIapFormatLocale, IAP_CURRENCY_LOCALE, normalizeIapCurrencyCode };
