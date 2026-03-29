import { isSubscriptionsPubliclyAvailable } from '@/shared/config/buildEnv';
import { getRevenueCatApiKeyAndroid, getRevenueCatApiKeyIos } from '@/shared/config/runtimeConfig';
import { fetchProLicenseStatus } from '@/shared/lib/ai-api/proLicenseApi';
import { IS_ANDROID, IS_IOS } from '@/shared/lib/platform';

import { clearProEntitlementSync, setProExpiresAtMsSync } from './proEntitlementStorage';
import { PRO_LICENSE_MIN_ATTEMPT_MS, PRO_LICENSE_MIN_BACKGROUND_FETCH_MS } from './syncIntervals';

function isRevenueCatIapConfigured(): boolean {
  if (!isSubscriptionsPubliclyAvailable()) {
    return false;
  }
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

let lastSuccessfulFetchAt = 0;
let lastAttemptAt = 0;
let syncTail: Promise<void> = Promise.resolve();

export function syncProLicenseFromServer(force: boolean): Promise<void> {
  const run = syncTail.then(async () => {
    const now = Date.now();
    if (
      !force &&
      lastSuccessfulFetchAt > 0 &&
      now - lastSuccessfulFetchAt < PRO_LICENSE_MIN_BACKGROUND_FETCH_MS
    ) {
      return;
    }

    if (!force && lastAttemptAt > 0 && now - lastAttemptAt < PRO_LICENSE_MIN_ATTEMPT_MS) {
      return;
    }

    lastAttemptAt = now;

    const status = await fetchProLicenseStatus({ force });
    if (status == null) {
      return;
    }

    if (status.active && status.expiresAt) {
      const ms = new Date(status.expiresAt).getTime();
      if (Number.isFinite(ms) && ms > Date.now()) {
        setProExpiresAtMsSync(ms);
      } else if (!isRevenueCatIapConfigured()) {
        clearProEntitlementSync();
      } else {
        const { refreshProEntitlementFromRevenueCatOnly } =
          await import('@/features/entitlements/lib/revenueCat');
        await refreshProEntitlementFromRevenueCatOnly();
      }
    } else if (!isRevenueCatIapConfigured()) {
      clearProEntitlementSync();
    } else {
      const { refreshProEntitlementFromRevenueCatOnly } =
        await import('@/features/entitlements/lib/revenueCat');
      await refreshProEntitlementFromRevenueCatOnly();
    }

    lastSuccessfulFetchAt = Date.now();
  });

  syncTail = run.catch(() => {});
  return run;
}
