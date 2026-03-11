export type AIModelId =
  | 'google/gemini-3-flash-preview'
  | 'arcee-ai/trinity-large-preview:free'
  | 'openai/gpt-5-nano';

export type TranscriptionLanguage =
  | 'auto'
  | 'ru'
  | 'en'
  | 'de'
  | 'fr'
  | 'es'
  | 'it'
  | 'pt'
  | 'zh'
  | 'ja'
  | 'ko'
  | 'ar'
  | 'uk'
  | 'pl';

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

export type SettingsState = {
  selectedAIModel: AIModelId;
  selectedWhisperModel: WhisperModelId;
  transcriptionLanguage: TranscriptionLanguage;
  autoTranscribeOnSave: boolean;
  whisperModelStatuses: Partial<Record<WhisperModelId, WhisperModelStatus>>;
  whisperDownloadProgress: Partial<Record<WhisperModelId, number>>;
  whisperDownloadBytes: Partial<Record<WhisperModelId, DownloadBytes>>;
  setAIModel: (id: AIModelId) => void;
  setWhisperModel: (id: WhisperModelId) => void;
  setTranscriptionLanguage: (lang: TranscriptionLanguage) => void;
  setAutoTranscribeOnSave: (value: boolean) => void;
  setWhisperModelStatus: (id: WhisperModelId, status: WhisperModelStatus) => void;
  setDownloadProgress: (
    id: WhisperModelId,
    progress: number,
    bytesWritten?: number,
    contentLength?: number,
  ) => void;
  removeWhisperModelStatus: (id: WhisperModelId) => void;
};
