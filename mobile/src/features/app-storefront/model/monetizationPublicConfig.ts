import { getSubscriptionsPubliclyAvailable as getSubscriptionsPubliclyAvailableFromConfig } from '@/shared/config/runtimeConfig';

/** Whether the in-app subscription storefront is shown as public IAP vs “coming soon”. */
export type MonetizationMode = 'iap_public' | 'coming_soon';

export function getSubscriptionsPubliclyAvailable(): boolean {
  return getSubscriptionsPubliclyAvailableFromConfig();
}

export function getPaymentsEnabled(): boolean {
  return getSubscriptionsPubliclyAvailable();
}

/**
 * Store paywall mode only (see {@link getSubscriptionsPubliclyAvailable}).
 * Promo / license key activation is orthogonal — use {@link getProLicenseKeyActivationEnabled}
 * from runtime config; both can be on at once with `iap_public`.
 */
export function getMonetizationMode(): MonetizationMode {
  if (getSubscriptionsPubliclyAvailable()) {
    return 'iap_public';
  }

  return 'coming_soon';
}

export function getShowProUpsellHints(): boolean {
  return !getSubscriptionsPubliclyAvailable();
}

export function isAutomationUiLockedForPublicStore(isProActive: boolean): boolean {
  return !isProActive;
}
