export { getEntitlementBackend } from './lib/resolveEntitlementBackend';
export type { PurchaseProResult } from './lib/revenueCat';
export {
  getDefaultProPackagePriceString,
  getRevenueCatIntegrationEnabled,
  initRevenueCatWhenReady,
  purchaseDefaultProPackage,
  restoreProPurchases,
} from './lib/revenueCat';
export type { EntitlementBackendKind, EntitlementPortSnapshot } from './model/types';
