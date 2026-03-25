export {
  shouldApplyAutoAiAfterTranscription,
  shouldApplyAutoTranscribeOnSave,
} from './lib/effectiveAutomation';
export {
  FREE_MAX_RECORDING_MS,
  getMaxRecordingMsForTier,
  PRO_MAX_RECORDING_MS,
  RECORDING_FINAL_WARNING_REMAINING_MS,
  RECORDING_SOFT_WARNING_REMAINING_MS,
} from './lib/recordingDurationLimits';
export { getStorefrontCountryCode } from './lib/storefront';
export type { MonetizationMode } from './model/monetizationPublicConfig';
export {
  getMonetizationMode,
  getPaymentsEnabled,
  getShowComingSoonInsteadOfPurchase,
  getShowProUpsellHints,
  getSubscriptionsPubliclyAvailable,
  isAutomationUiLockedForPublicStore,
} from './model/monetizationPublicConfig';
export { useAdsAllowed } from './model/useAdsAllowed';
