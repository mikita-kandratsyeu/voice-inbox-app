import type { AccentColorId } from '@/shared/config';
import type { HapticsIntensity } from '@/shared/lib/haptics/types';

export type { HapticsIntensity };

export type AppTheme = 'light' | 'dark' | 'system';
export type AppLanguage = 'system' | 'en' | 'ru';

export type UserSelectableAIModelId =
  | 'deepseek/deepseek-v4-flash'
  | 'deepseek/deepseek-v4-pro'
  | 'google/gemini-2.5-flash-lite'
  | 'google/gemini-3.1-flash-lite'
  | 'minimax/minimax-m2.7'
  | 'minimax/minimax-m3'
  | 'nvidia/nemotron-3-super-120b-a12b'
  | 'xiaomi/mimo-v2.5'
  | 'xiaomi/mimo-v2.5-pro';
export type LocalAiModelId =
  | 'local/qwen3-1.7b-q4_k_m'
  | 'local/gemma-2-2b-it-q4_k_m'
  | 'local/llama-3.2-1b-q4_k_m';

export type AIModelId = UserSelectableAIModelId;

export type TranscriptionLanguage = 'auto' | 'ru' | 'en' | 'de' | 'fr' | 'es' | 'zh' | 'ja';
export type TranscriptionQualityMode = 'fast' | 'balanced' | 'quality';
export type SummaryStyle = 'brief' | 'standard' | 'detailed';
export type TaskStrictness = 'strict' | 'balanced' | 'soft';
export type AiOutputLanguage = 'same' | 'ru' | 'en';
export type AiExecutionMode = 'smart_hybrid' | 'private_experimental';
export type PrivateLocalLlmBudget = 'efficient' | 'balanced' | 'expanded';
/** Custom OpenAI-compatible server output length (null max_tokens when unlimited). */
export type PrivateRemoteOutputBudget = PrivateLocalLlmBudget | 'unlimited';
/** How many queued summaries may run at once against the private AI server. */
export type PrivateRemoteQueueConcurrency = 1 | 2 | 3 | 4 | 5;
export type PrivateCapabilityTier = 'full' | 'limited' | 'unavailable';
export type PrivateAiProvider = 'local' | 'custom_openai';
export type PrivateRemoteConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};
export type PrivateRemoteProfile = PrivateRemoteConfig & {
  id: string;
  name: string;
  updatedAt: number;
};

export type WhisperModelId =
  | 'whisper-tiny'
  | 'whisper-base'
  | 'whisper-small'
  | 'whisper-medium'
  | 'whisper-large-v3-turbo';
export type WhisperModelWeightsFormat = 'q5_1' | 'full';
/** GGML weights format or WhisperKit Core ML bundle (iOS). */
export type WhisperModelStorageFormat = WhisperModelWeightsFormat | 'whisperkit';
export type WhisperModelVariantId = `${WhisperModelId}:${WhisperModelStorageFormat}`;

export type WhisperModelStatus = 'not_downloaded' | 'downloading' | 'downloaded' | 'error';

export type AutoArchiveAfterDays = 1 | 7 | 14 | 30;
export type BackupReminderPeriodDays = 7 | 14 | 30;

export type AIModel = {
  id: AIModelId;
  name: string;
  provider: string;
  descriptionKey: string;
  speed: 'fast' | 'medium' | 'slow';
};

export type AiModelTierLabelKey =
  | 'aiModels.tierDeepSeek'
  | 'aiModels.tierDeepSeekPro'
  | 'aiModels.tierFast'
  | 'aiModels.tierMiMo'
  | 'aiModels.tierMiMoPro'
  | 'aiModels.tierNemotron'
  | 'aiModels.tierPremium'
  | 'aiModels.tierSmart';

export type AiUserTierCode = 'fast' | 'smarter' | 'premium_experimental';
export type AiModelRoutingMode = 'manual' | 'auto';

export type UserFacingAIModel = Omit<AIModel, 'id'> & {
  id: UserSelectableAIModelId;
  tierLabelKey: AiModelTierLabelKey;
  supportTierCode: AiUserTierCode;
  /** Model context window for picker chips (tokens). */
  contextTokens: number;
  /** Cloud Smart mode: OpenRouter routes with `provider.zdr` (see web `openRouterProviderParamsForModel`). */
  usesOpenRouterZdr: boolean;
};

export type WhisperModel = {
  id: WhisperModelId;
  name: string;
  description: string;
  sizeLabel: string;
  sizeMb: number;
  accuracy: 'low' | 'medium' | 'high' | 'very_high';
  speed: 'fast' | 'medium' | 'slow' | 'very_slow';
  status: WhisperModelStatus;
};

export type DownloadBytes = {
  written: number;
  total: number;
};

export type WhisperDownloadPhase =
  | 'weights'
  | 'coreml'
  | 'whisperkit'
  | 'whisperkit_prepare'
  | 'speakerkit';

export type SettingsState = {
  appTheme: AppTheme;
  accentColorId: AccentColorId;
  appLanguage: AppLanguage;
  selectedAIModel: UserSelectableAIModelId;
  aiModelRoutingMode: AiModelRoutingMode;
  selectedLocalAiModel: LocalAiModelId | null;
  selectedWhisperModel: WhisperModelId;
  selectedWhisperModelFormat: WhisperModelWeightsFormat;
  whisperModelWeightsFormat: WhisperModelWeightsFormat;
  transcriptionLanguage: TranscriptionLanguage;
  transcriptionQualityMode: TranscriptionQualityMode;
  /** iOS-only rollout flag for WhisperKit transcription engine. */
  iosWhisperKitEngineEnabled: boolean;
  /** iOS-only: enable on-device diarization during transcription (WhisperKit path). */
  transcriptionDiarizationEnabled: boolean;
  /** Names, brands, and terms passed to Whisper as initial prompt hints. */
  transcriptionCustomWords: string[];
  summaryStyle: SummaryStyle;
  taskStrictness: TaskStrictness;
  aiOutputLanguage: AiOutputLanguage;
  aiExecutionMode: AiExecutionMode;
  privateLocalLlmBudget: PrivateLocalLlmBudget;
  privateRemoteOutputBudget: PrivateRemoteOutputBudget;
  /** Request `response_format: json_object` on custom server when supported. */
  privateRemotePreferJsonObject: boolean;
  /** Parallel drain limit for the private AI task queue. */
  privateRemoteQueueConcurrency: PrivateRemoteQueueConcurrency;
  privateCapabilityTier: PrivateCapabilityTier;
  privateAiProvider: PrivateAiProvider;
  privateRemoteBaseUrl: string;
  privateRemoteApiKey: string;
  privateRemoteModel: string;
  privateRemoteLastSuccessfulBaseUrl: string;
  privateRemoteLastSuccessfulApiKey: string;
  privateRemoteLastSuccessfulModel: string;
  privateRemoteProfiles: PrivateRemoteProfile[];
  privateRemoteActiveProfileId: string | null;
  autoTranscribeOnSave: boolean;
  autoAiAfterTranscription: boolean;
  /** Private custom-server auto-summary preference (independent of smart mode). */
  privateAutoAiAfterTranscription: boolean;
  autoArchiveEnabled: boolean;
  autoArchiveAfterDays: AutoArchiveAfterDays;
  /** Shake phone to open the recording screen from anywhere in the app. */
  shakeToRecordEnabled: boolean;
  /** Shake on Ask AI while generating to cancel the response. */
  shakeToCancelAskAiEnabled: boolean;
  /** Off / subtle system haptics / rich Pulsar presets. */
  hapticsIntensity: HapticsIntensity;
  taskDeadlineNotificationsEnabled: boolean;
  backupReminderNotificationsEnabled: boolean;
  backupReminderPeriodDays: BackupReminderPeriodDays;
  aiProcessingAlertsEnabled: boolean;
  transcriptionRecoveryNotificationsEnabled: boolean;
  appLockRecordingNotificationsEnabled: boolean;
  cloudAiThirdPartyConsentAccepted: boolean;
  cloudAiKvTtlSeconds: number;
  /** Smart mode: show optional reasoning block on the summary tab. */
  showSummaryReasoningInNotes: boolean;
  /** Meeting mode: re-run speaker breakdown when summary/tasks are regenerated. */
  autoRefreshMeetingSpeakersOnRegen: boolean;
  whisperModelStatuses: Partial<Record<WhisperModelVariantId, WhisperModelStatus>>;
  whisperDownloadProgress: Partial<Record<WhisperModelVariantId, number>>;
  whisperDownloadBytes: Partial<Record<WhisperModelVariantId, DownloadBytes>>;
  whisperDownloadPhase: Partial<Record<WhisperModelVariantId, WhisperDownloadPhase>>;
  localLlmModelStatuses: Partial<Record<LocalAiModelId, WhisperModelStatus>>;
  localLlmDownloadProgress: Partial<Record<LocalAiModelId, number>>;
  localLlmDownloadBytes: Partial<Record<LocalAiModelId, DownloadBytes>>;
  setAppTheme: (value: AppTheme) => void;
  setAccentColorId: (value: AccentColorId) => void;
  setAppLanguage: (value: AppLanguage) => void;
  setAIModel: (id: UserSelectableAIModelId) => void;
  setAiModelRoutingMode: (mode: AiModelRoutingMode) => void;
  setLocalAiModel: (id: LocalAiModelId) => void;
  clearLocalAiModelSelection: () => void;
  setWhisperModel: (id: WhisperModelId) => void;
  setWhisperModelWeightsFormat: (value: WhisperModelWeightsFormat) => void;
  setTranscriptionLanguage: (lang: TranscriptionLanguage) => void;
  setTranscriptionQualityMode: (mode: TranscriptionQualityMode) => void;
  setIosWhisperKitEngineEnabled: (value: boolean) => void;
  setTranscriptionDiarizationEnabled: (value: boolean) => void;
  setTranscriptionCustomWords: (words: string[]) => void;
  setSummaryStyle: (value: SummaryStyle) => void;
  setTaskStrictness: (value: TaskStrictness) => void;
  setAiOutputLanguage: (value: AiOutputLanguage) => void;
  setAiExecutionMode: (value: AiExecutionMode) => void;
  setPrivateLocalLlmBudget: (value: PrivateLocalLlmBudget) => void;
  setPrivateRemoteOutputBudget: (value: PrivateRemoteOutputBudget) => void;
  setPrivateRemotePreferJsonObject: (value: boolean) => void;
  setPrivateRemoteQueueConcurrency: (value: PrivateRemoteQueueConcurrency) => void;
  setPrivateCapabilityTier: (value: PrivateCapabilityTier) => void;
  setPrivateAiProvider: (value: PrivateAiProvider) => void;
  setPrivateRemoteBaseUrl: (value: string) => void;
  setPrivateRemoteApiKey: (value: string) => void;
  setPrivateRemoteModel: (value: string) => void;
  setPrivateRemoteLastSuccessfulConfig: (value: PrivateRemoteConfig) => void;
  upsertPrivateRemoteProfile: (value: PrivateRemoteProfile) => void;
  setPrivateRemoteActiveProfile: (id: string | null) => void;
  removePrivateRemoteProfile: (id: string) => void;
  setAutoTranscribeOnSave: (value: boolean) => void;
  setAutoAiAfterTranscription: (value: boolean) => void;
  setPrivateAutoAiAfterTranscription: (value: boolean) => void;
  setAutoArchiveEnabled: (value: boolean) => void;
  setAutoArchiveAfterDays: (value: AutoArchiveAfterDays) => void;
  setShakeToRecordEnabled: (value: boolean) => void;
  setShakeToCancelAskAiEnabled: (value: boolean) => void;
  setHapticsIntensity: (value: HapticsIntensity) => void;
  setTaskDeadlineNotificationsEnabled: (value: boolean) => void;
  setBackupReminderNotificationsEnabled: (value: boolean) => void;
  setBackupReminderPeriodDays: (value: BackupReminderPeriodDays) => void;
  setAiProcessingAlertsEnabled: (value: boolean) => void;
  setTranscriptionRecoveryNotificationsEnabled: (value: boolean) => void;
  setAppLockRecordingNotificationsEnabled: (value: boolean) => void;
  setCloudAiThirdPartyConsentAccepted: (value: boolean) => void;
  setCloudAiKvTtlSeconds: (value: number) => void;
  setShowSummaryReasoningInNotes: (value: boolean) => void;
  setAutoRefreshMeetingSpeakersOnRegen: (value: boolean) => void;
  setWhisperModelStatus: (
    id: WhisperModelId,
    format: WhisperModelStorageFormat,
    status: WhisperModelStatus,
  ) => void;
  setWhisperModelStatuses: (
    statuses: Partial<Record<WhisperModelVariantId, WhisperModelStatus>>,
  ) => void;
  setDownloadProgress: (
    id: WhisperModelId,
    format: WhisperModelStorageFormat,
    progress: number,
    bytesWritten?: number,
    contentLength?: number,
    phase?: WhisperDownloadPhase,
  ) => void;
  removeWhisperModelStatus: (id: WhisperModelId, format: WhisperModelStorageFormat) => void;
  setLocalLlmModelStatus: (id: LocalAiModelId, status: WhisperModelStatus) => void;
  setLocalLlmModelStatuses: (statuses: Partial<Record<LocalAiModelId, WhisperModelStatus>>) => void;
  setLocalLlmDownloadProgress: (
    id: LocalAiModelId,
    progress: number,
    bytesWritten?: number,
    contentLength?: number,
  ) => void;
  removeLocalLlmModelStatus: (id: LocalAiModelId) => void;
};
