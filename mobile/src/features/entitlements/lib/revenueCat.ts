import {
  REVENUECAT_API_KEY_ANDROID,
  REVENUECAT_API_KEY_IOS,
  REVENUECAT_ENTITLEMENT_ID,
  REVENUECAT_PACKAGE_TYPE_PREFERRED,
} from '@env';
import type { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import Purchases, { PURCHASES_ERROR_CODE } from 'react-native-purchases';

import {
  clearProEntitlementSync,
  setProExpiresAtMsSync,
} from '@/features/pro-license/lib/proEntitlementStorage';
import { syncProLicenseFromServer } from '@/features/pro-license/lib/syncProLicenseFromServer';
import { isSubscriptionsPubliclyAvailable } from '@/shared/config/buildEnv';
import { invalidateProLicenseStatusCache } from '@/shared/lib/ai-api/proLicenseApi';
import { IS_ANDROID, IS_IOS } from '@/shared/lib/platform';

function trimEnv(v: string | undefined): string {
  return (v ?? '').trim();
}

function getEntitlementId(): string {
  const id = trimEnv(REVENUECAT_ENTITLEMENT_ID);
  return id.length > 0 ? id : 'pro';
}

export function getRevenueCatApiKeyForPlatform(): string | null {
  const ios = trimEnv(REVENUECAT_API_KEY_IOS);
  const android = trimEnv(REVENUECAT_API_KEY_ANDROID);

  if (IS_IOS && ios.length > 0) return ios;
  if (IS_ANDROID && android.length > 0) return android;

  return null;
}

export function getRevenueCatIntegrationEnabled(): boolean {
  return isSubscriptionsPubliclyAvailable() && getRevenueCatApiKeyForPlatform() != null;
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

async function onCustomerInfoUpdated(info: CustomerInfo): Promise<void> {
  applyCustomerInfoToProStorage(info);
  invalidateProLicenseStatusCache();
  await syncProLicenseFromServer(true);
}

function pickPackageFromOffering(offering: PurchasesOffering | null): PurchasesPackage | null {
  if (!offering) return null;
  const pref = trimEnv(REVENUECAT_PACKAGE_TYPE_PREFERRED).toUpperCase();
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
    await onCustomerInfoUpdated(info);
  } catch (e) {
    if (__DEV__) {
      console.warn('[RevenueCat] init failed', e);
    }
  }
}

export type PurchaseProResult = { ok: true } | { ok: false; cancelled: boolean; message: string };

function isPurchasesError(e: unknown): e is { code: PURCHASES_ERROR_CODE; message: string } {
  return (
    typeof e === 'object' &&
    e != null &&
    'code' in e &&
    typeof (e as { code: unknown }).code === 'string'
  );
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
    await onCustomerInfoUpdated(customerInfo);
    return { ok: true };
  } catch (e) {
    if (isPurchasesError(e) && e.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { ok: false, cancelled: true, message: 'cancelled' };
    }
    const msg = isPurchasesError(e) ? e.message : 'unknown';
    if (__DEV__) {
      console.warn('[RevenueCat] purchase failed', e);
    }
    return { ok: false, cancelled: false, message: msg };
  }
}

export async function restoreProPurchases(): Promise<PurchaseProResult> {
  if (!getRevenueCatIntegrationEnabled()) {
    return { ok: false, cancelled: false, message: 'iap_unavailable' };
  }
  try {
    const customerInfo = await Purchases.restorePurchases();
    await onCustomerInfoUpdated(customerInfo);
    return { ok: true };
  } catch (e) {
    const msg = isPurchasesError(e) ? e.message : 'unknown';
    if (__DEV__) {
      console.warn('[RevenueCat] restore failed', e);
    }
    return { ok: false, cancelled: false, message: msg };
  }
}
