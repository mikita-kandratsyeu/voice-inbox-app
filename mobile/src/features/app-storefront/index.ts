export {
  shouldApplyAutoAiAfterTranscription,
  shouldApplyAutoTranscribeOnSave,
  shouldApplyPrivateServerAutoAi,
} from './lib/effectiveAutomation';
export type { RecordingDurationExecutionMode } from './lib/recordingDurationLimits';
export {
  FREE_MAX_RECORDING_MS,
  getMaxRecordingMsForTier,
  PRIVATE_MAX_RECORDING_MS,
  PRO_MAX_RECORDING_MS,
  RECORDING_FINAL_WARNING_REMAINING_MS,
  RECORDING_SOFT_WARNING_REMAINING_MS,
} from './lib/recordingDurationLimits';
export { getStorefrontCountryCode, presentIosManageSubscriptionsSheet } from './lib/storefront';
export type { MonetizationMode } from './model/monetizationPublicConfig';
export {
  getMonetizationMode,
  isAutomationUiLockedForPublicStore,
} from './model/monetizationPublicConfig';
export { computeAdsAllowedForInterstitial, useAdsAllowed } from './model/useAdsAllowed';
