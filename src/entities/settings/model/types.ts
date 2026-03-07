export type AIModelId =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'claude-3-5-sonnet'
  | 'claude-3-haiku'
  | 'gemini-1-5-pro'
  | 'gemini-1-5-flash';

export type WhisperModelId =
  | 'whisper-tiny'
  | 'whisper-base'
  | 'whisper-small'
  | 'whisper-medium'
  | 'whisper-large-v3';

export type WhisperModelStatus = 'not_downloaded' | 'downloading' | 'downloaded';

export type AIModel = {
  id: AIModelId;
  name: string;
  provider: string;
  description: string;
  contextWindow: string;
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

export type SettingsState = {
  selectedAIModel: AIModelId;
  selectedWhisperModel: WhisperModelId;
  whisperModelStatuses: Partial<Record<WhisperModelId, WhisperModelStatus>>;
  setAIModel: (id: AIModelId) => void;
  setWhisperModel: (id: WhisperModelId) => void;
  setWhisperModelStatus: (id: WhisperModelId, status: WhisperModelStatus) => void;
};
