export { getEntitlementBackend } from './lib/resolveEntitlementBackend';
export type {
  IapBillingOptions,
  IapBillingPeriod,
  IapBillingProductRow,
  IapIntroFreePeriod,
  PurchaseProResult,
} from './lib/revenueCat';
export {
  getProBillingPriceOptions,
  getRevenueCatIntegrationEnabled,
  initRevenueCatWhenReady,
  purchaseDefaultProPackage,
  purchaseProPackageForPeriod,
  resolveDefaultIapBillingPeriod,
  restoreProPurchases,
} from './lib/revenueCat';
export type { EntitlementBackendKind, EntitlementPortSnapshot } from './model/types';
