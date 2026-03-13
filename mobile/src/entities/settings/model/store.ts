import { create } from 'zustand';

import { storage } from '@/shared/lib/async-storage';

import { AI_MODELS } from './constants';
import type {
  AIModelId,
  AiOutputLanguage,
  SettingsState,
  SummaryStyle,
  TaskStrictness,
  TranscriptionLanguage,
  WhisperModelId,
  WhisperModelStatus,
} from './types';

const KEYS = {
  AI_MODEL: 'settings.aiModel',
  WHISPER_MODEL: 'settings.whisperModel',
  WHISPER_STATUSES: 'settings.whisperStatuses',
  TRANSCRIPTION_LANGUAGE: 'settings.transcriptionLanguage',
  SUMMARY_STYLE: 'settings.summaryStyle',
  TASK_STRICTNESS: 'settings.taskStrictness',
  AI_OUTPUT_LANGUAGE: 'settings.aiOutputLanguage',
  AUTO_TRANSCRIBE_ON_SAVE: 'settings.autoTranscribeOnSave',
  AUTO_AI_AFTER_TRANSCRIPTION: 'settings.autoAiAfterTranscription',
} as const;

const getStoredAIModel = (): AIModelId => {
  const val = storage.getString(KEYS.AI_MODEL);

  return (val as AIModelId) ?? AI_MODELS[0].id;
};

const getStoredWhisperModel = (): WhisperModelId => {
  const val = storage.getString(KEYS.WHISPER_MODEL);

  return (val as WhisperModelId) ?? 'whisper-base';
};

const getStoredTranscriptionLanguage = (): TranscriptionLanguage => {
  const val = storage.getString(KEYS.TRANSCRIPTION_LANGUAGE);
  return (val as TranscriptionLanguage) ?? 'auto';
};

const getStoredAutoTranscribeOnSave = (): boolean => {
  const val = storage.getString(KEYS.AUTO_TRANSCRIBE_ON_SAVE);
  return val === 'true';
};

const getStoredAutoAiAfterTranscription = (): boolean => {
  const val = storage.getString(KEYS.AUTO_AI_AFTER_TRANSCRIPTION);
  return val === 'true';
};

const getStoredSummaryStyle = (): SummaryStyle => {
  const val = storage.getString(KEYS.SUMMARY_STYLE);
  return (val as SummaryStyle) ?? 'standard';
};

const getStoredTaskStrictness = (): TaskStrictness => {
  const val = storage.getString(KEYS.TASK_STRICTNESS);
  return (val as TaskStrictness) ?? 'balanced';
};

const getStoredAiOutputLanguage = (): AiOutputLanguage => {
  const val = storage.getString(KEYS.AI_OUTPUT_LANGUAGE);
  return (val as AiOutputLanguage) ?? 'same';
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
  summaryStyle: getStoredSummaryStyle(),
  taskStrictness: getStoredTaskStrictness(),
  aiOutputLanguage: getStoredAiOutputLanguage(),
  autoTranscribeOnSave: getStoredAutoTranscribeOnSave(),
  autoAiAfterTranscription: getStoredAutoAiAfterTranscription(),
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

  setSummaryStyle: (value: SummaryStyle) => {
    storage.set(KEYS.SUMMARY_STYLE, value);
    set({ summaryStyle: value });
  },

  setTaskStrictness: (value: TaskStrictness) => {
    storage.set(KEYS.TASK_STRICTNESS, value);
    set({ taskStrictness: value });
  },

  setAiOutputLanguage: (value: AiOutputLanguage) => {
    storage.set(KEYS.AI_OUTPUT_LANGUAGE, value);
    set({ aiOutputLanguage: value });
  },

  setAutoTranscribeOnSave: (value: boolean) => {
    storage.set(KEYS.AUTO_TRANSCRIBE_ON_SAVE, String(value));
    set({ autoTranscribeOnSave: value });
  },

  setAutoAiAfterTranscription: (value: boolean) => {
    storage.set(KEYS.AUTO_AI_AFTER_TRANSCRIPTION, String(value));
    set({ autoAiAfterTranscription: value });
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
