import { isTestflightInternalBuild } from '@/shared/config/buildEnv';
import { getSubscriptionsPubliclyAvailable as getSubscriptionsPubliclyAvailableFromConfig } from '@/shared/config/runtimeConfig';

export type MonetizationMode = 'iap_public' | 'internal_license' | 'coming_soon';

export function getSubscriptionsPubliclyAvailable(): boolean {
  return getSubscriptionsPubliclyAvailableFromConfig();
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

export function isAutomationUiLockedForPublicStore(isProActive: boolean): boolean {
  return !isProActive;
}
