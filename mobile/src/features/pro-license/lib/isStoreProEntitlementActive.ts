import Purchases from 'react-native-purchases';

import {
  getRevenueCatApiKeyAndroid,
  getRevenueCatApiKeyIos,
  getRevenueCatEntitlementId,
} from '@/shared/config/runtimeConfig';
import { IS_ANDROID, IS_IOS } from '@/shared/lib/platform';

export function isRevenueCatStoreBillingConfigured(): boolean {
  const ios = (getRevenueCatApiKeyIos() ?? '').trim();
  const android = (getRevenueCatApiKeyAndroid() ?? '').trim();

  if (IS_IOS && ios.length > 0) {
    return true;
  }

  if (IS_ANDROID && android.length > 0) {
    return true;
  }

  return false;
}

export async function isStoreProEntitlementActiveNow(): Promise<boolean> {
  if (!isRevenueCatStoreBillingConfigured()) {
    return false;
  }

  try {
    const info = await Purchases.getCustomerInfo();
    const entitlementId = (getRevenueCatEntitlementId() ?? '').trim() || 'pro';
    const ent = info.entitlements.active[entitlementId];

    if (!ent?.isActive) {
      return false;
    }

    const ms = ent.expirationDateMillis;

    if (ms != null && Number.isFinite(ms)) {
      return ms > Date.now();
    }

    if (ent.expirationDate == null) {
      return true;
    }

    const parsed = new Date(ent.expirationDate).getTime();

    return Number.isFinite(parsed) && parsed > Date.now();
  } catch {
    return false;
  }
}
