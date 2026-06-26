export { areFoldersEnabledInAiMode } from './lib/areFoldersEnabledInAiMode';
export { canDeviceRunWhisperModel } from './lib/canDeviceRunWhisperModel';
export {
  AUTO_ROUTING_CONTEXT_TOKENS,
  buildAutoModelMetaChips,
  buildCloudModelMetaChips,
  type ModelMetaChip,
} from './lib/cloudModelMetaChips';
export {
  formatAiModelDisplayName,
  resolveAiModelDisplayLabel,
} from './lib/formatAiModelDisplayName';
export { formatModelContextTokens } from './lib/formatModelContextTokens';
export {
  type AiSettingsDiagnostics,
  getAiSettingsDiagnostics,
} from './lib/getAiSettingsDiagnostics';
export { isDigestAiEnabled } from './lib/isDigestAiEnabled';
export { isPrivateCustomServerMode } from './lib/isPrivateCustomServerMode';
export {
  getOnboardingCuratedCloudModels,
  ONBOARDING_CURATED_CLOUD_MODEL_IDS,
  shouldShowOnboardingAllModelsHint,
} from './lib/onboardingCuratedAiModels';
export { partitionCloudModelsForPicker } from './lib/partitionCloudModelsForPicker';
export {
  canEnablePrivateMode,
  formatPrivateDiagnosticsFreeDiskGb,
  formatPrivateDiagnosticsRamGb,
  type PrivateAiCapabilityDiagnostics,
  resolvePrivateAiCapabilityTier,
} from './lib/privateAiCapability';
export {
  clampPrivateRemoteQueueConcurrency,
  DEFAULT_PRIVATE_REMOTE_QUEUE_CONCURRENCY,
  parseStoredPrivateRemoteQueueConcurrency,
  PRIVATE_REMOTE_QUEUE_CONCURRENCY_OPTIONS,
} from './lib/privateRemoteQueueConcurrency';
export { FALLBACK_AI_MODEL_WHEN_NOT_PRO, isProOnlyAiModel } from './lib/proOnlyAiModels';
export { RECOMMENDED_AI_MODEL_ID } from './lib/recommendAiModel';
export { getRecommendedWhisperModelId } from './lib/recommendWhisperModel';
export { resolveEffectivePrivateAiProvider } from './lib/resolveEffectivePrivateAiProvider';
export {
  hydratePrivateRemoteWorkingConfig,
  type PrivateRemoteConnectionConfig,
  resolvePrivateRemoteConnectionConfig,
} from './lib/resolvePrivateRemoteConnectionConfig';
export { syncPrivateCapabilityTier } from './lib/syncPrivateCapabilityTier';
export { TRANSCRIPTION_LANGUAGES, TRANSLATE_LANGUAGES } from './lib/transcriptionLanguages';
export { useRecommendedWhisperModelId } from './lib/useRecommendedWhisperModelId';
export { useWhisperModelCompatibility } from './lib/useWhisperModelCompatibility';
export type { LocalAiDeviceLoad, LocalAiModelCatalogEntry } from './model/constants';
export {
  AI_MODELS,
  DEFAULT_LOCAL_AI_MODEL_ID,
  DEFAULT_SELECTED_WHISPER_MODEL_ID,
  DEFAULT_WHISPER_MODEL_WEIGHTS_FORMAT,
  findCloudAiModelCatalogEntry,
  getActiveWhisperModelVariantId,
  getCloudModelsForPicker,
  getLocalAiModelEntry,
  getOfflineWhisperStorageLabel,
  getWhisperCoreMlSizeMb,
  getWhisperEstimatedDownloadSizeMb,
  getWhisperKitModelVariantId,
  getWhisperModelDisplayName,
  getWhisperModelSizeMb,
  getWhisperModelVariantId,
  LOCAL_AI_MODELS,
  USER_FACING_AI_MODELS,
  USER_FACING_AI_MODELS_BY_SPEED,
  WHISPER_KIT_STORAGE_FORMAT,
  WHISPER_MODELS,
} from './model/constants';
export { useSettingsStore } from './model/store';
export type {
  AiExecutionMode,
  AIModel,
  AIModelId,
  AiModelRoutingMode,
  AiModelTierLabelKey,
  AiOutputLanguage,
  AiUserTierCode,
  AppLanguage,
  AppTheme,
  AutoArchiveAfterDays,
  BackupReminderPeriodDays,
  DownloadBytes,
  LocalAiModelId,
  PrivateAiProvider,
  PrivateCapabilityTier,
  PrivateLocalLlmBudget,
  PrivateRemoteConfig,
  PrivateRemoteOutputBudget,
  PrivateRemoteProfile,
  PrivateRemoteQueueConcurrency,
  SettingsState,
  SummaryStyle,
  TaskStrictness,
  TranscriptionLanguage,
  TranscriptionQualityMode,
  UserFacingAIModel,
  UserSelectableAIModelId,
  WhisperDownloadPhase,
  WhisperModel,
  WhisperModelId,
  WhisperModelStatus,
  WhisperModelStorageFormat,
  WhisperModelVariantId,
  WhisperModelWeightsFormat,
} from './model/types';
export type { AccentColorId } from '@/shared/config';
