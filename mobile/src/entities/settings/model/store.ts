import { create } from 'zustand';

import { storage } from '@/shared/lib/async-storage';

import type { AIModelId, SettingsState, WhisperModelId, WhisperModelStatus } from './types';

const KEYS = {
  AI_MODEL: 'settings.aiModel',
  WHISPER_MODEL: 'settings.whisperModel',
  WHISPER_STATUSES: 'settings.whisperStatuses',
} as const;

const getStoredAIModel = (): AIModelId => {
  const val = storage.getString(KEYS.AI_MODEL);

  return (val as AIModelId) ?? 'google/gemini-3-flash-preview';
};

const getStoredWhisperModel = (): WhisperModelId => {
  const val = storage.getString(KEYS.WHISPER_MODEL);

  return (val as WhisperModelId) ?? 'whisper-base';
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
  whisperModelStatuses: getStoredWhisperStatuses(),

  setAIModel: (id: AIModelId) => {
    storage.set(KEYS.AI_MODEL, id);
    set({ selectedAIModel: id });
  },

  setWhisperModel: (id: WhisperModelId) => {
    storage.set(KEYS.WHISPER_MODEL, id);
    set({ selectedWhisperModel: id });
  },

  setWhisperModelStatus: (id: WhisperModelId, status: WhisperModelStatus) => {
    const current = get().whisperModelStatuses;
    const updated = { ...current, [id]: status };

    storage.set(KEYS.WHISPER_STATUSES, JSON.stringify(updated));
    set({ whisperModelStatuses: updated });
  },
}));
