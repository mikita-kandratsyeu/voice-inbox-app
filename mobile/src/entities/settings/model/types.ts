import type { AccentColorId } from '@/shared/config';

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
export type SummaryStyle = 'brief' | 'standard' | 'detailed';
export type TaskStrictness = 'strict' | 'balanced' | 'soft';
export type AiOutputLanguage = 'same' | 'ru' | 'en';
export type AiExecutionMode = 'smart_hybrid' | 'private_experimental';
export type PrivateLocalLlmBudget = 'efficient' | 'balanced' | 'expanded';
/** Custom OpenAI-compatible server output length (null max_tokens when unlimited). */
export type PrivateRemoteOutputBudget = PrivateLocalLlmBudget | 'unlimited';
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

export type WhisperModelId = 'whisper-tiny' | 'whisper-base' | 'whisper-small' | 'whisper-medium';
export type WhisperModelWeightsFormat = 'q5_1' | 'full';
export type WhisperModelVariantId = `${WhisperModelId}:${WhisperModelWeightsFormat}`;

export type WhisperModelStatus = 'not_downloaded' | 'downloading' | 'downloaded' | 'error';

export type AutoArchiveAfterDays = 1 | 7 | 14 | 30;

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

export type WhisperDownloadPhase = 'weights' | 'coreml';

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
  summaryStyle: SummaryStyle;
  taskStrictness: TaskStrictness;
  aiOutputLanguage: AiOutputLanguage;
  aiExecutionMode: AiExecutionMode;
  privateLocalLlmBudget: PrivateLocalLlmBudget;
  privateRemoteOutputBudget: PrivateRemoteOutputBudget;
  /** Request `response_format: json_object` on custom server when supported. */
  privateRemotePreferJsonObject: boolean;
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
  autoArchiveEnabled: boolean;
  autoArchiveAfterDays: AutoArchiveAfterDays;
  taskDeadlineNotificationsEnabled: boolean;
  aiProcessingAlertsEnabled: boolean;
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
  setSummaryStyle: (value: SummaryStyle) => void;
  setTaskStrictness: (value: TaskStrictness) => void;
  setAiOutputLanguage: (value: AiOutputLanguage) => void;
  setAiExecutionMode: (value: AiExecutionMode) => void;
  setPrivateLocalLlmBudget: (value: PrivateLocalLlmBudget) => void;
  setPrivateRemoteOutputBudget: (value: PrivateRemoteOutputBudget) => void;
  setPrivateRemotePreferJsonObject: (value: boolean) => void;
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
  setAutoArchiveEnabled: (value: boolean) => void;
  setAutoArchiveAfterDays: (value: AutoArchiveAfterDays) => void;
  setTaskDeadlineNotificationsEnabled: (value: boolean) => void;
  setAiProcessingAlertsEnabled: (value: boolean) => void;
  setCloudAiThirdPartyConsentAccepted: (value: boolean) => void;
  setCloudAiKvTtlSeconds: (value: number) => void;
  setShowSummaryReasoningInNotes: (value: boolean) => void;
  setAutoRefreshMeetingSpeakersOnRegen: (value: boolean) => void;
  setWhisperModelStatus: (
    id: WhisperModelId,
    format: WhisperModelWeightsFormat,
    status: WhisperModelStatus,
  ) => void;
  setWhisperModelStatuses: (
    statuses: Partial<Record<WhisperModelVariantId, WhisperModelStatus>>,
  ) => void;
  setDownloadProgress: (
    id: WhisperModelId,
    format: WhisperModelWeightsFormat,
    progress: number,
    bytesWritten?: number,
    contentLength?: number,
    phase?: WhisperDownloadPhase,
  ) => void;
  removeWhisperModelStatus: (id: WhisperModelId, format: WhisperModelWeightsFormat) => void;
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
