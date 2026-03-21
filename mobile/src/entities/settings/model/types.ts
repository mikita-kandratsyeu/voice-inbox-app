export type AppTheme = 'light' | 'dark' | 'system';
export type AppLanguage = 'system' | 'en' | 'ru';

export type AIModelId =
  | 'google/gemini-3.1-flash-lite-preview'
  | 'openai/gpt-5-nano'
  | 'deepseek/deepseek-v3.2'
  | 'google/gemini-2.5-flash-lite'
  | 'arcee-ai/trinity-large-preview:free';

export type TranscriptionLanguage = 'auto' | 'ru' | 'en' | 'de' | 'fr' | 'es' | 'zh' | 'ja';
export type SummaryStyle = 'brief' | 'standard' | 'detailed';
export type TaskStrictness = 'strict' | 'balanced' | 'soft';
export type AiOutputLanguage = 'same' | 'ru' | 'en';

export type WhisperModelId = 'whisper-tiny' | 'whisper-base' | 'whisper-small' | 'whisper-medium';

export type WhisperModelStatus = 'not_downloaded' | 'downloading' | 'downloaded' | 'error';

export type AIModel = {
  id: AIModelId;
  name: string;
  provider: string;
  descriptionKey: string;
  speed: 'fast' | 'medium' | 'slow';
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
  appLanguage: AppLanguage;
  selectedAIModel: AIModelId;
  selectedWhisperModel: WhisperModelId;
  transcriptionLanguage: TranscriptionLanguage;
  summaryStyle: SummaryStyle;
  taskStrictness: TaskStrictness;
  aiOutputLanguage: AiOutputLanguage;
  autoTranscribeOnSave: boolean;
  autoAiAfterTranscription: boolean;
  whisperModelStatuses: Partial<Record<WhisperModelId, WhisperModelStatus>>;
  whisperDownloadProgress: Partial<Record<WhisperModelId, number>>;
  whisperDownloadBytes: Partial<Record<WhisperModelId, DownloadBytes>>;
  whisperDownloadPhase: Partial<Record<WhisperModelId, WhisperDownloadPhase>>;
  setAppTheme: (value: AppTheme) => void;
  setAppLanguage: (value: AppLanguage) => void;
  setAIModel: (id: AIModelId) => void;
  setWhisperModel: (id: WhisperModelId) => void;
  setTranscriptionLanguage: (lang: TranscriptionLanguage) => void;
  setSummaryStyle: (value: SummaryStyle) => void;
  setTaskStrictness: (value: TaskStrictness) => void;
  setAiOutputLanguage: (value: AiOutputLanguage) => void;
  setAutoTranscribeOnSave: (value: boolean) => void;
  setAutoAiAfterTranscription: (value: boolean) => void;
  setWhisperModelStatus: (id: WhisperModelId, status: WhisperModelStatus) => void;
  setDownloadProgress: (
    id: WhisperModelId,
    progress: number,
    bytesWritten?: number,
    contentLength?: number,
    phase?: WhisperDownloadPhase,
  ) => void;
  removeWhisperModelStatus: (id: WhisperModelId) => void;
};
