import { create } from 'zustand';

import { storage } from '@/shared/lib/async-storage';

import type {
  AIModelId,
  SettingsState,
  TranscriptionLanguage,
  WhisperModelId,
  WhisperModelStatus,
} from './types';

const KEYS = {
  AI_MODEL: 'settings.aiModel',
  WHISPER_MODEL: 'settings.whisperModel',
  WHISPER_STATUSES: 'settings.whisperStatuses',
  TRANSCRIPTION_LANGUAGE: 'settings.transcriptionLanguage',
} as const;

const getStoredAIModel = (): AIModelId => {
  const val = storage.getString(KEYS.AI_MODEL);

  return (val as AIModelId) ?? 'google/gemini-3-flash-preview';
};

const getStoredWhisperModel = (): WhisperModelId => {
  const val = storage.getString(KEYS.WHISPER_MODEL);

  return (val as WhisperModelId) ?? 'whisper-base';
};

const getStoredTranscriptionLanguage = (): TranscriptionLanguage => {
  const val = storage.getString(KEYS.TRANSCRIPTION_LANGUAGE);
  return (val as TranscriptionLanguage) ?? 'auto';
};

const getStoredWhisperStatuses = (): Partial<Record<WhisperModelId, WhisperModelStatus>> => {
  try {
    const raw = storage.getString(KEYS.WHISPER_STATUSES);

    return raw ? (JSON.parse(raw) as Partial<Record<WhisperModelId, WhisperModelStatus>>) : {};
  } catch {
    return {};
  }
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  selectedAIModel: getStoredAIModel(),
  selectedWhisperModel: getStoredWhisperModel(),
  transcriptionLanguage: getStoredTranscriptionLanguage(),
  whisperModelStatuses: getStoredWhisperStatuses(),
  whisperDownloadProgress: {},
  whisperDownloadBytes: {},

  setAIModel: (id: AIModelId) => {
    storage.set(KEYS.AI_MODEL, id);
    set({ selectedAIModel: id });
  },

  setWhisperModel: (id: WhisperModelId) => {
    storage.set(KEYS.WHISPER_MODEL, id);
    set({ selectedWhisperModel: id });
  },

  setTranscriptionLanguage: (lang: TranscriptionLanguage) => {
    storage.set(KEYS.TRANSCRIPTION_LANGUAGE, lang);
    set({ transcriptionLanguage: lang });
  },

  setWhisperModelStatus: (id: WhisperModelId, status: WhisperModelStatus) => {
    const current = get().whisperModelStatuses;
    const updated = { ...current, [id]: status };

    storage.set(KEYS.WHISPER_STATUSES, JSON.stringify(updated));
    set({ whisperModelStatuses: updated });
  },

  setDownloadProgress: (
    id: WhisperModelId,
    progress: number,
    bytesWritten?: number,
    contentLength?: number,
  ) => {
    const currentProgress = get().whisperDownloadProgress;
    const currentBytes = get().whisperDownloadBytes;
    const updatedBytes =
      bytesWritten !== undefined && contentLength !== undefined
        ? { ...currentBytes, [id]: { written: bytesWritten, total: contentLength } }
        : currentBytes;
    set({
      whisperDownloadProgress: { ...currentProgress, [id]: progress },
      whisperDownloadBytes: updatedBytes,
    });
  },

  removeWhisperModelStatus: (id: WhisperModelId) => {
    const currentStatuses = get().whisperModelStatuses;
    const currentProgress = get().whisperDownloadProgress;
    const currentBytes = get().whisperDownloadBytes;

    const updatedStatuses = { ...currentStatuses };
    delete updatedStatuses[id];

    const updatedProgress = { ...currentProgress };
    delete updatedProgress[id];

    const updatedBytes = { ...currentBytes };
    delete updatedBytes[id];

    storage.set(KEYS.WHISPER_STATUSES, JSON.stringify(updatedStatuses));
    set({
      whisperModelStatuses: updatedStatuses,
      whisperDownloadProgress: updatedProgress,
      whisperDownloadBytes: updatedBytes,
    });
  },
}));
