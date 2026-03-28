import type { AccentColorId } from '@/shared/config';

export type AppTheme = 'light' | 'dark' | 'system';
export type AppLanguage = 'system' | 'en' | 'ru';

export type UserSelectableAIModelId =
  | 'google/gemini-2.5-flash-lite'
  | 'google/gemini-3.1-flash-lite-preview'
  | 'minimax/minimax-m2.7';
export type LocalAiModelId =
  | 'local/qwen3-1.7b-q4_k_m'
  | 'local/gemma-2-2b-it-q4_k_m'
  | 'local/phi-3.5-mini-instruct-q4_k_m';

export type AIModelId =
  | UserSelectableAIModelId
  | 'deepseek/deepseek-v3.2'
  | 'google/gemini-2.5-flash-lite';

export type TranscriptionLanguage = 'auto' | 'ru' | 'en' | 'de' | 'fr' | 'es' | 'zh' | 'ja';
export type SummaryStyle = 'brief' | 'standard' | 'detailed';
export type TaskStrictness = 'strict' | 'balanced' | 'soft';
export type AiOutputLanguage = 'same' | 'ru' | 'en';
export type AiExecutionMode = 'smart_hybrid' | 'private_experimental';
export type PrivateCapabilityTier = 'full' | 'limited' | 'unavailable';

export type WhisperModelId = 'whisper-tiny' | 'whisper-base' | 'whisper-small' | 'whisper-medium';
export type WhisperModelWeightsFormat = 'q5_1' | 'full';
export type WhisperModelVariantId = `${WhisperModelId}:${WhisperModelWeightsFormat}`;

export type WhisperModelStatus = 'not_downloaded' | 'downloading' | 'downloaded' | 'error';

export type AIModel = {
  id: AIModelId;
  name: string;
  provider: string;
  descriptionKey: string;
  speed: 'fast' | 'medium' | 'slow';
};

export type AiModelTierLabelKey =
  | 'aiModels.tierFast'
  | 'aiModels.tierSmart'
  | 'aiModels.tierPremium';

export type AiUserTierCode = 'fast' | 'smarter' | 'premium_experimental';

export type UserFacingAIModel = Omit<AIModel, 'id'> & {
  id: UserSelectableAIModelId;
  tierLabelKey: AiModelTierLabelKey;
  supportTierCode: AiUserTierCode;
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
  selectedLocalAiModel: LocalAiModelId | null;
  selectedWhisperModel: WhisperModelId;
  selectedWhisperModelFormat: WhisperModelWeightsFormat;
  whisperModelWeightsFormat: WhisperModelWeightsFormat;
  transcriptionLanguage: TranscriptionLanguage;
  summaryStyle: SummaryStyle;
  taskStrictness: TaskStrictness;
  aiOutputLanguage: AiOutputLanguage;
  aiExecutionMode: AiExecutionMode;
  privateCapabilityTier: PrivateCapabilityTier;
  autoTranscribeOnSave: boolean;
  autoAiAfterTranscription: boolean;
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
  setLocalAiModel: (id: LocalAiModelId) => void;
  clearLocalAiModelSelection: () => void;
  setWhisperModel: (id: WhisperModelId) => void;
  setWhisperModelWeightsFormat: (value: WhisperModelWeightsFormat) => void;
  setTranscriptionLanguage: (lang: TranscriptionLanguage) => void;
  setSummaryStyle: (value: SummaryStyle) => void;
  setTaskStrictness: (value: TaskStrictness) => void;
  setAiOutputLanguage: (value: AiOutputLanguage) => void;
  setAiExecutionMode: (value: AiExecutionMode) => void;
  reconcileAiExecutionModeAfterRemoteConfig: () => void;
  setPrivateCapabilityTier: (value: PrivateCapabilityTier) => void;
  setAutoTranscribeOnSave: (value: boolean) => void;
  setAutoAiAfterTranscription: (value: boolean) => void;
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
