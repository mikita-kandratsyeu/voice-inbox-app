import type {
  CustomerInfo,
  PurchasesIntroPrice,
  PurchasesOffering,
  PurchasesPackage,
  PurchasesStoreProduct,
} from 'react-native-purchases';
import Purchases, { PURCHASES_ERROR_CODE } from 'react-native-purchases';

import {
  clearProEntitlementSync,
  isProActiveFromStorageSync,
  setProExpiresAtMsSync,
} from '@/features/pro-license/lib/proEntitlementStorage';
import { syncProLicenseFromServer } from '@/features/pro-license/lib/syncProLicenseFromServer';
import { isSubscriptionsPubliclyAvailable } from '@/shared/config/buildEnv';
import {
  getRevenueCatApiKeyAndroid,
  getRevenueCatApiKeyIos,
  getRevenueCatEntitlementId,
  getRevenueCatPackageTypePreferred,
} from '@/shared/config/runtimeConfig';
import { isString } from '@/shared/lib';
import {
  invalidateProLicenseStatusCache,
  syncProLicenseRevenueCatOnServer,
} from '@/shared/lib/ai-api/proLicenseApi';
import { IS_ANDROID, IS_IOS } from '@/shared/lib/platform';

function trimEnv(v: string | undefined): string {
  return (v ?? '').trim();
}

function getEntitlementId(): string {
  const id = trimEnv(getRevenueCatEntitlementId());

  return id.length > 0 ? id : 'pro';
}

export function getRevenueCatApiKeyForPlatform(): string | null {
  const ios = trimEnv(getRevenueCatApiKeyIos());
  const android = trimEnv(getRevenueCatApiKeyAndroid());

  if (IS_IOS && ios.length > 0) return ios;
  if (IS_ANDROID && android.length > 0) return android;

  return null;
}

export function getRevenueCatIntegrationEnabled(): boolean {
  return isSubscriptionsPubliclyAvailable() && getRevenueCatApiKeyForPlatform() != null;
}

function isPurchasesError(e: unknown): e is { code: PURCHASES_ERROR_CODE; message: string } {
  return (
    typeof e === 'object' && e != null && 'code' in e && isString((e as { code: unknown }).code)
  );
}

function logPurchasesFailure(context: string, e: unknown): void {
  if (isPurchasesError(e)) {
    console.warn(`[RevenueCat] ${context}`, e.code, e.message);
    return;
  }

  const msg = e instanceof Error ? e.message : String(e);
  console.warn(`[RevenueCat] ${context}`, msg);
}

let sessionConfigured = false;
let boundAppUserId: string | null = null;
let listenerRegistered = false;

function applyCustomerInfoToProStorage(info: CustomerInfo): void {
  const entitlementId = getEntitlementId();
  const ent = info.entitlements.active[entitlementId];
  if (ent?.isActive) {
    const ms = ent.expirationDateMillis;
    if (ms != null && Number.isFinite(ms) && ms > Date.now()) {
      setProExpiresAtMsSync(ms);
      return;
    }
    if (ent.expirationDate == null) {
      setProExpiresAtMsSync(new Date('2100-01-01T00:00:00.000Z').getTime());
      return;
    }
  }
  clearProEntitlementSync();
}

type CustomerInfoSyncOptions = {
  forceRevenueCatServerSync?: boolean;
};

async function onCustomerInfoUpdated(
  info: CustomerInfo,
  options?: CustomerInfoSyncOptions,
): Promise<void> {
  applyCustomerInfoToProStorage(info);
  invalidateProLicenseStatusCache();
  if (getRevenueCatIntegrationEnabled()) {
    await syncProLicenseRevenueCatOnServer({
      force: options?.forceRevenueCatServerSync === true,
    });
  }
  await syncProLicenseFromServer(true);
}

export async function refreshProEntitlementFromRevenueCatOnly(): Promise<void> {
  if (!getRevenueCatIntegrationEnabled()) {
    return;
  }
  try {
    const info = await Purchases.getCustomerInfo();
    applyCustomerInfoToProStorage(info);
    invalidateProLicenseStatusCache();
  } catch (e) {
    logPurchasesFailure('refreshProEntitlementFromRevenueCatOnly', e);
  }
}

export type IapBillingPeriod = 'annual' | 'monthly';

function packageForPeriod(
  offering: PurchasesOffering | null,
  period: IapBillingPeriod,
): PurchasesPackage | null {
  if (!offering) return null;
  if (period === 'annual') return offering.annual ?? null;
  return offering.monthly ?? null;
}

export type IapIntroFreePeriod = {
  unit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
  count: number;
};

export type IapBillingProductRow = {
  priceString: string;
  /** Annual subscription: store-formatted equivalent per month */
  pricePerMonthString: string | null;
  introFree: IapIntroFreePeriod | null;
};

export type IapBillingOptions = {
  monthly: IapBillingProductRow | null;
  annual: IapBillingProductRow | null;
  savePercentVsMonthly: number | null;
};

function formatIapCurrencyAmount(amount: number, currencyCode: string): string | null {
  const code = (currencyCode ?? '').trim().toUpperCase();
  if (!code || !Number.isFinite(amount)) {
    return null;
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    }).format(amount);
  } catch {
    return null;
  }
}

function introFreeFromIntro(
  intro: PurchasesIntroPrice | null | undefined,
): IapIntroFreePeriod | null {
  if (!intro || intro.price > 0) {
    return null;
  }
  const u = (intro.periodUnit ?? '').toUpperCase();
  if (u !== 'DAY' && u !== 'WEEK' && u !== 'MONTH' && u !== 'YEAR') {
    return null;
  }
  const count = intro.periodNumberOfUnits;
  if (!Number.isFinite(count) || count <= 0) {
    return null;
  }
  return { unit: u as IapIntroFreePeriod['unit'], count };
}

function billingRowFromProduct(
  product: PurchasesStoreProduct | undefined,
  tier: 'monthly' | 'annual',
): IapBillingProductRow | null {
  if (!product) {
    return null;
  }
  const rawMain = product.priceString?.trim();
  const formattedMain = formatIapCurrencyAmount(product.price, product.currencyCode);
  const priceString = formattedMain ?? rawMain;
  if (!priceString) {
    return null;
  }

  let pricePerMonthString: string | null = null;
  if (tier === 'annual') {
    const perMonthNum =
      product.pricePerMonth != null &&
      Number.isFinite(product.pricePerMonth) &&
      product.pricePerMonth > 0
        ? product.pricePerMonth
        : Number.isFinite(product.price) && product.price > 0
          ? product.price / 12
          : null;
    if (perMonthNum != null) {
      const formatted = formatIapCurrencyAmount(perMonthNum, product.currencyCode);
      const rawPer = product.pricePerMonthString?.trim();
      pricePerMonthString = formatted ?? (rawPer && rawPer.length > 0 ? rawPer : null);
    }
  }

  return {
    priceString,
    pricePerMonthString,
    introFree: introFreeFromIntro(product.introPrice),
  };
}

export function resolveDefaultIapBillingPeriod(opts: IapBillingOptions): IapBillingPeriod {
  const hasM = opts.monthly != null;
  const hasA = opts.annual != null;
  if (hasA && hasM) {
    const pref = trimEnv(getRevenueCatPackageTypePreferred()).toUpperCase();

    if (pref === 'MONTHLY') return 'monthly';

    return 'annual';
  }

  if (hasA) return 'annual';

  return 'monthly';
}

function pickPackageFromOffering(offering: PurchasesOffering | null): PurchasesPackage | null {
  if (!offering) return null;
  const pref = trimEnv(getRevenueCatPackageTypePreferred()).toUpperCase();
  const byPref: Record<string, PurchasesPackage | null> = {
    ANNUAL: offering.annual,
    MONTHLY: offering.monthly,
    WEEKLY: offering.weekly,
    LIFETIME: offering.lifetime,
    SIX_MONTH: offering.sixMonth,
    THREE_MONTH: offering.threeMonth,
    TWO_MONTH: offering.twoMonth,
  };
  if (pref && byPref[pref]) {
    return byPref[pref]!;
  }
  return (
    offering.annual ??
    offering.monthly ??
    offering.sixMonth ??
    offering.threeMonth ??
    offering.twoMonth ??
    offering.weekly ??
    offering.lifetime ??
    offering.availablePackages[0] ??
    null
  );
}

export async function initRevenueCatWhenReady(deviceId: string): Promise<void> {
  if (!getRevenueCatIntegrationEnabled()) {
    return;
  }
  const apiKey = getRevenueCatApiKeyForPlatform();
  const trimmed = deviceId.trim();
  if (!apiKey || !trimmed) {
    return;
  }

  try {
    if (!sessionConfigured) {
      Purchases.configure({ apiKey, appUserID: trimmed });
      sessionConfigured = true;
      boundAppUserId = trimmed;
    } else if (boundAppUserId !== trimmed) {
      await Purchases.logIn(trimmed);
      boundAppUserId = trimmed;
    }

    if (!listenerRegistered) {
      Purchases.addCustomerInfoUpdateListener((info) => {
        void onCustomerInfoUpdated(info);
      });
      listenerRegistered = true;
    }

    const info = await Purchases.getCustomerInfo();
    await onCustomerInfoUpdated(info, { forceRevenueCatServerSync: true });
  } catch (e) {
    logPurchasesFailure('init', e);
  }
}

export type PurchaseProResult = { ok: true } | { ok: false; cancelled: boolean; message: string };

export type RestoreProPurchasesResult =
  | { ok: true; entitlementActive: boolean }
  | { ok: false; message: string };

export async function getProBillingPriceOptions(): Promise<IapBillingOptions> {
  if (!getRevenueCatIntegrationEnabled()) {
    return { monthly: null, annual: null, savePercentVsMonthly: null };
  }
  try {
    const offerings = await Purchases.getOfferings();
    const o = offerings.current;
    if (!o) {
      return { monthly: null, annual: null, savePercentVsMonthly: null };
    }
    const monthly = billingRowFromProduct(o.monthly?.product, 'monthly');
    const annual = billingRowFromProduct(o.annual?.product, 'annual');

    let savePercentVsMonthly: number | null = null;
    const mp = o.monthly?.product?.price;
    const ap = o.annual?.product?.price;
    if (monthly && annual && mp != null && ap != null && mp > 0 && ap > 0) {
      const yearAtMonthlyRate = mp * 12;
      if (ap < yearAtMonthlyRate) {
        const pct = Math.round((1 - ap / yearAtMonthlyRate) * 100);
        savePercentVsMonthly = pct >= 1 ? pct : null;
      }
    }

    return { monthly, annual, savePercentVsMonthly };
  } catch (e) {
    logPurchasesFailure('getProBillingPriceOptions', e);
    return { monthly: null, annual: null, savePercentVsMonthly: null };
  }
}

export async function purchaseProPackageForPeriod(
  period: IapBillingPeriod,
): Promise<PurchaseProResult> {
  if (!getRevenueCatIntegrationEnabled()) {
    return { ok: false, cancelled: false, message: 'iap_unavailable' };
  }
  try {
    const offerings = await Purchases.getOfferings();
    const pkg = packageForPeriod(offerings.current, period);

    if (!pkg) {
      return { ok: false, cancelled: false, message: 'no_package' };
    }

    const { customerInfo } = await Purchases.purchasePackage(pkg);
    await onCustomerInfoUpdated(customerInfo, { forceRevenueCatServerSync: true });

    return { ok: true };
  } catch (e) {
    if (isPurchasesError(e) && e.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { ok: false, cancelled: true, message: 'cancelled' };
    }

    const msg = isPurchasesError(e) ? e.message : 'unknown';
    logPurchasesFailure('purchaseProPackageForPeriod', e);

    return { ok: false, cancelled: false, message: msg };
  }
}

export async function purchaseDefaultProPackage(): Promise<PurchaseProResult> {
  if (!getRevenueCatIntegrationEnabled()) {
    return { ok: false, cancelled: false, message: 'iap_unavailable' };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const pkg = pickPackageFromOffering(offerings.current);

    if (!pkg) {
      return { ok: false, cancelled: false, message: 'no_package' };
    }

    const { customerInfo } = await Purchases.purchasePackage(pkg);
    await onCustomerInfoUpdated(customerInfo, { forceRevenueCatServerSync: true });

    return { ok: true };
  } catch (e) {
    if (isPurchasesError(e) && e.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { ok: false, cancelled: true, message: 'cancelled' };
    }

    const msg = isPurchasesError(e) ? e.message : 'unknown';
    logPurchasesFailure('purchaseDefaultProPackage', e);

    return { ok: false, cancelled: false, message: msg };
  }
}

export async function restoreProPurchases(): Promise<RestoreProPurchasesResult> {
  if (!getRevenueCatIntegrationEnabled()) {
    return { ok: false, message: 'iap_unavailable' };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    await onCustomerInfoUpdated(customerInfo, { forceRevenueCatServerSync: true });

    return { ok: true, entitlementActive: isProActiveFromStorageSync() };
  } catch (e) {
    const msg = isPurchasesError(e) ? e.message : 'unknown';
    logPurchasesFailure('restoreProPurchases', e);

    return { ok: false, message: msg };
  }
}
