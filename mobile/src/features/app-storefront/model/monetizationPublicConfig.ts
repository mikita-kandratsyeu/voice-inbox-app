import { isSubscriptionsPubliclyAvailable } from '@/shared/config/buildEnv';
import { isTestflightInternalBuild } from '@/shared/config/buildEnv';

export type MonetizationMode = 'iap_public' | 'internal_license' | 'coming_soon';

export function getSubscriptionsPubliclyAvailable(): boolean {
  return isSubscriptionsPubliclyAvailable();
}

export function getPaymentsEnabled(): boolean {
  return getSubscriptionsPubliclyAvailable();
}

export function getMonetizationMode(): MonetizationMode {
  if (getSubscriptionsPubliclyAvailable()) {
    return 'iap_public';
  }

  if (isTestflightInternalBuild()) {
    return 'internal_license';
  }

  return 'coming_soon';
}

export function getShowProUpsellHints(): boolean {
  return !getSubscriptionsPubliclyAvailable();
}

export function getShowComingSoonInsteadOfPurchase(): boolean {
  return getMonetizationMode() === 'coming_soon';
}

export function isAutomationUiLockedForPublicStore(isProActive: boolean): boolean {
  return !isProActive;
}
