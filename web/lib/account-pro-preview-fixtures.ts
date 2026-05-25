import type { ProActivationKind } from '@/lib/pro-entitlement';

export type AccountProPreviewLocale = 'en' | 'ru';
export type AccountProPreviewState = 'success' | 'missing' | 'invalid' | 'inactive';
export type AccountProPreviewTheme = 'light' | 'dark';

/** Shortcut for local QA (`?variant=voucher-success`). */
export type AccountProPreviewVariant =
  | 'voucher-success'
  | 'license-success'
  | 'store-success'
  | 'missing'
  | 'invalid'
  | 'inactive';

export type AccountProPreviewOptions = {
  locale: AccountProPreviewLocale;
  state: AccountProPreviewState;
  theme: AccountProPreviewTheme;
  kind: ProActivationKind;
  isLifetime: boolean;
  sampleExpiresAt: string;
};

const DEFAULT_EXPIRES = '2026-06-16T00:00:00.000Z';

function paramFirst(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  if (searchParams instanceof URLSearchParams) {
    const v = searchParams.get(key);
    return v?.trim() || undefined;
  }
  const v = searchParams[key];
  if (v == null) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === 'string' ? s.trim() : undefined;
}

export function parseAccountProPreviewVariant(
  raw: string | null | undefined,
): AccountProPreviewVariant | null {
  if (
    raw === 'voucher-success' ||
    raw === 'license-success' ||
    raw === 'store-success' ||
    raw === 'missing' ||
    raw === 'invalid' ||
    raw === 'inactive'
  ) {
    return raw;
  }
  return null;
}

function optionsFromVariant(
  variant: AccountProPreviewVariant,
): Pick<AccountProPreviewOptions, 'state' | 'kind' | 'isLifetime'> {
  switch (variant) {
    case 'voucher-success':
      return { state: 'success', kind: 'voucher', isLifetime: false };
    case 'license-success':
      return { state: 'success', kind: 'license', isLifetime: false };
    case 'store-success':
      return { state: 'success', kind: 'store', isLifetime: false };
    case 'missing':
      return { state: 'missing', kind: 'license', isLifetime: false };
    case 'invalid':
      return { state: 'invalid', kind: 'license', isLifetime: false };
    case 'inactive':
      return { state: 'inactive', kind: 'license', isLifetime: false };
  }
}

export function parseAccountProPreviewOptions(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
  routeLocale?: string,
): AccountProPreviewOptions {
  const localeParam = paramFirst(searchParams, 'locale');
  const locale: AccountProPreviewLocale =
    localeParam === 'ru' || routeLocale === 'ru' ? 'ru' : 'en';

  const variant = parseAccountProPreviewVariant(paramFirst(searchParams, 'variant'));
  if (variant != null) {
    const fromVariant = optionsFromVariant(variant);
    const lifetimeParam = paramFirst(searchParams, 'lifetime');
    const isLifetime = lifetimeParam === '1' || lifetimeParam === 'true';
    const theme: AccountProPreviewTheme =
      paramFirst(searchParams, 'theme') === 'dark' ? 'dark' : 'light';
    const expiresRaw = paramFirst(searchParams, 'expires');
    const sampleExpiresAt = expiresRaw && expiresRaw !== '' ? expiresRaw : DEFAULT_EXPIRES;

    return {
      locale,
      theme,
      sampleExpiresAt,
      ...fromVariant,
      isLifetime: fromVariant.state === 'success' ? isLifetime : false,
    };
  }

  const rawState = paramFirst(searchParams, 'state') ?? 'success';
  const state: AccountProPreviewState =
    rawState === 'missing' ||
    rawState === 'invalid' ||
    rawState === 'inactive' ||
    rawState === 'success'
      ? rawState
      : 'success';

  const kindParam = paramFirst(searchParams, 'kind');
  const kind: ProActivationKind =
    kindParam === 'store' ? 'store' : kindParam === 'voucher' ? 'voucher' : 'license';

  const lifetimeParam = paramFirst(searchParams, 'lifetime');
  const isLifetime = lifetimeParam === '1' || lifetimeParam === 'true';

  const theme: AccountProPreviewTheme =
    paramFirst(searchParams, 'theme') === 'dark' ? 'dark' : 'light';

  const expiresRaw = paramFirst(searchParams, 'expires');
  const sampleExpiresAt = expiresRaw && expiresRaw !== '' ? expiresRaw : DEFAULT_EXPIRES;

  return {
    locale,
    state,
    kind,
    isLifetime,
    theme,
    sampleExpiresAt,
  };
}

export type AccountProPreviewExampleLink = {
  label: string;
  href: string;
};

export { buildAccountProPreviewExampleLinks } from '@/lib/dev-preview-catalog';
