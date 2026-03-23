import { isSubscriptionsPubliclyAvailable } from '@/shared/config/buildEnv';

export function getSubscriptionsPubliclyAvailable(): boolean {
  return isSubscriptionsPubliclyAvailable();
}

export function getPaymentsEnabled(): boolean {
  return getSubscriptionsPubliclyAvailable();
}

export function getShowProUpsellHints(): boolean {
  return !getSubscriptionsPubliclyAvailable();
}

export function getShowComingSoonInsteadOfPurchase(): boolean {
  return !getPaymentsEnabled();
}

export function isAutomationUiLockedForPublicStore(isProActive: boolean): boolean {
  return !isProActive;
}
