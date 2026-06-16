export type MonetizationMode = 'iap_public';

export function getMonetizationMode(): MonetizationMode {
  return 'iap_public';
}

export function isAutomationUiLockedForPublicStore(isProActive: boolean): boolean {
  return !isProActive;
}
