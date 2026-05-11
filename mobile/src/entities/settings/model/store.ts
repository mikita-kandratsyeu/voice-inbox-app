import { create } from 'zustand';

import { parseAccentColorId } from '@/shared/config';
import { getExperimentalPrivateAiEnabled } from '@/shared/config/runtimeConfig';
import { releaseLocalLlmSession } from '@/shared/lib/ai-core/localLlmSession';
import { storage } from '@/shared/lib/async-storage';

import { CLOUD_AI_KV_TTL_DEFAULT_SECONDS, snapCloudAiKvTtlToChoice } from '../lib/cloudAiKvTtl';
import { RECOMMENDED_AI_MODEL_ID } from '../lib/recommendAiModel';
import {
  DEFAULT_SELECTED_WHISPER_MODEL_ID,
  DEFAULT_WHISPER_MODEL_WEIGHTS_FORMAT,
  getWhisperModelVariantId,
  LOCAL_AI_MODELS,
  USER_FACING_AI_MODELS,
} from './constants';
import type {
  AiExecutionMode,
  AiModelRoutingMode,
  AiOutputLanguage,
  AppLanguage,
  AppTheme,
  AutoArchiveAfterDays,
  LocalAiModelId,
  PrivateCapabilityTier,
  PrivateLocalLlmBudget,
  SettingsState,
  SummaryStyle,
  TaskStrictness,
  TranscriptionLanguage,
  UserSelectableAIModelId,
  WhisperDownloadPhase,
  WhisperModelId,
  WhisperModelStatus,
  WhisperModelVariantId,
  WhisperModelWeightsFormat,
} from './types';

const LEGACY_APPLE_LOCAL_AI_MODEL = 'apple/on-device-foundation' as const;

const KEYS = {
  APP_THEME: 'settings.appTheme',
  ACCENT_COLOR_ID: 'settings.accentColorId',
  APP_LANGUAGE: 'settings.appLanguage',
  AI_MODEL: 'settings.aiModel',
  AI_MODEL_ROUTING_MODE: 'settings.aiModelRoutingMode',
  LOCAL_AI_MODEL: 'settings.localAiModel',
  WHISPER_MODEL: 'settings.whisperModel',
  WHISPER_MODEL_WEIGHTS_FORMAT: 'settings.whisperModelWeightsFormat',
  WHISPER_SELECTED_MODEL_FORMAT: 'settings.whisperSelectedModelFormat',
  WHISPER_STATUSES: 'settings.whisperStatuses',
  TRANSCRIPTION_LANGUAGE: 'settings.transcriptionLanguage',
  SUMMARY_STYLE: 'settings.summaryStyle',
  TASK_STRICTNESS: 'settings.taskStrictness',
  AI_OUTPUT_LANGUAGE: 'settings.aiOutputLanguage',
  AI_EXECUTION_MODE: 'settings.aiExecutionMode',
  PRIVATE_LOCAL_LLM_BUDGET: 'settings.privateLocalLlmBudget',
  PRIVATE_CAPABILITY_TIER: 'settings.privateCapabilityTier',
  AUTO_TRANSCRIBE_ON_SAVE: 'settings.autoTranscribeOnSave',
  AUTO_AI_AFTER_TRANSCRIPTION: 'settings.autoAiAfterTranscription',
  AUTO_ARCHIVE_ENABLED: 'settings.autoArchiveEnabled',
  AUTO_ARCHIVE_AFTER_DAYS: 'settings.autoArchiveAfterDays',
  CLOUD_AI_THIRD_PARTY_CONSENT: 'settings.cloudAiThirdPartyConsentAccepted',
  CLOUD_AI_KV_TTL_SECONDS: 'settings.cloudAiKvTtlSeconds',
  PRIVATE_PREVIOUS_THEME: 'settings.private.previousTheme',
  PRIVATE_PREVIOUS_AUTO_TRANSCRIBE: 'settings.private.previousAutoTranscribeOnSave',
  PRIVATE_PREVIOUS_AUTO_AI: 'settings.private.previousAutoAiAfterTranscription',
  PRIVATE_PREVIOUS_AUTO_ARCHIVE: 'settings.private.previousAutoArchiveEnabled',
  LOCAL_LLM_STATUSES: 'settings.localLlmStatuses',
} as const;

const getStoredAppTheme = (): AppTheme => {
  const val = storage.getString(KEYS.APP_THEME);
  return (val as AppTheme) ?? 'system';
};

const getStoredAccentColorId = () => {
  return parseAccentColorId(storage.getString(KEYS.ACCENT_COLOR_ID));
};

const getStoredAppLanguage = (): AppLanguage => {
  const val = storage.getString(KEYS.APP_LANGUAGE);
  return (val as AppLanguage) ?? 'system';
};

const USER_SELECTABLE_SET = new Set<string>(USER_FACING_AI_MODELS.map((m) => m.id));

const normalizeStoredAIModel = (raw: string | undefined): UserSelectableAIModelId => {
  if (raw && USER_SELECTABLE_SET.has(raw)) {
    return raw as UserSelectableAIModelId;
  }

  return RECOMMENDED_AI_MODEL_ID;
};

const getStoredAIModel = (): UserSelectableAIModelId => {
  const val = storage.getString(KEYS.AI_MODEL);
  return normalizeStoredAIModel(val);
};

const getStoredAiModelRoutingMode = (): AiModelRoutingMode => {
  const val = storage.getString(KEYS.AI_MODEL_ROUTING_MODE);
  if (val === 'auto' || val === 'manual') {
    return val;
  }

  const hasStoredExplicitAiModel = storage.contains(KEYS.AI_MODEL);
  return hasStoredExplicitAiModel ? 'manual' : 'auto';
};

const LOCAL_AI_MODEL_SET = new Set<string>(LOCAL_AI_MODELS.map((m) => m.id));
const GEMMA_LOCAL_AI_MODEL_ID: LocalAiModelId = 'local/gemma-2-2b-it-q4_k_m';

const getStoredLocalAiModel = (): LocalAiModelId | null => {
  const val = storage.getString(KEYS.LOCAL_AI_MODEL);

  if (val === LEGACY_APPLE_LOCAL_AI_MODEL) {
    storage.set(KEYS.LOCAL_AI_MODEL, GEMMA_LOCAL_AI_MODEL_ID);
    return GEMMA_LOCAL_AI_MODEL_ID;
  }

  if (val && LOCAL_AI_MODEL_SET.has(val)) {
    return val as LocalAiModelId;
  }

  if (val) {
    storage.remove(KEYS.LOCAL_AI_MODEL);
  }

  return null;
};

const getStoredLocalLlmStatuses = (): Partial<Record<LocalAiModelId, WhisperModelStatus>> => {
  try {
    const raw = storage.getString(KEYS.LOCAL_LLM_STATUSES);

    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, WhisperModelStatus>;

    if (
      Object.prototype.hasOwnProperty.call(parsed, LEGACY_APPLE_LOCAL_AI_MODEL) &&
      parsed[LEGACY_APPLE_LOCAL_AI_MODEL] !== undefined
    ) {
      const legacyStatus = parsed[LEGACY_APPLE_LOCAL_AI_MODEL];

      delete parsed[LEGACY_APPLE_LOCAL_AI_MODEL];

      if (parsed[GEMMA_LOCAL_AI_MODEL_ID] === undefined) {
        parsed[GEMMA_LOCAL_AI_MODEL_ID] = legacyStatus;
      }

      storage.set(KEYS.LOCAL_LLM_STATUSES, JSON.stringify(parsed));
    }

    let prunedUnknownIds = false;
    for (const key of Object.keys(parsed)) {
      if (!LOCAL_AI_MODEL_SET.has(key)) {
        delete parsed[key];
        prunedUnknownIds = true;
      }
    }
    if (prunedUnknownIds) {
      storage.set(KEYS.LOCAL_LLM_STATUSES, JSON.stringify(parsed));
    }

    return parsed as Partial<Record<LocalAiModelId, WhisperModelStatus>>;
  } catch {
    return {};
  }
};

const getStoredWhisperModel = (): WhisperModelId => {
  const val = storage.getString(KEYS.WHISPER_MODEL);

  return (val as WhisperModelId) ?? DEFAULT_SELECTED_WHISPER_MODEL_ID;
};

const getStoredWhisperModelWeightsFormat = (): WhisperModelWeightsFormat => {
  const val = storage.getString(KEYS.WHISPER_MODEL_WEIGHTS_FORMAT);

  if (val === 'full') return 'full';

  return DEFAULT_WHISPER_MODEL_WEIGHTS_FORMAT;
};

const getInitialSelectedWhisperModel = (): WhisperModelId => {
  return getStoredWhisperModel();
};

const getStoredSelectedWhisperModelFormat = (): WhisperModelWeightsFormat => {
  const val = storage.getString(KEYS.WHISPER_SELECTED_MODEL_FORMAT);

  if (val === 'full') return 'full';

  return DEFAULT_WHISPER_MODEL_WEIGHTS_FORMAT;
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

const parseAutoArchiveAfterDays = (raw: string | undefined): AutoArchiveAfterDays => {
  const n = raw ? Number(raw) : NaN;
  if (n === 1 || n === 7 || n === 14 || n === 30) return n;
  return 14;
};

const getStoredAutoArchiveEnabled = (): boolean => {
  return storage.getString(KEYS.AUTO_ARCHIVE_ENABLED) === 'true';
};

const getStoredAutoArchiveAfterDays = (): AutoArchiveAfterDays => {
  return parseAutoArchiveAfterDays(storage.getString(KEYS.AUTO_ARCHIVE_AFTER_DAYS));
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

const getStoredAiExecutionMode = (): AiExecutionMode => {
  const val = storage.getString(KEYS.AI_EXECUTION_MODE);
  return val === 'private_experimental' ? 'private_experimental' : 'smart_hybrid';
};

const PRIVATE_LLM_BUDGET_SET = new Set<string>(['efficient', 'balanced', 'expanded']);

const getStoredPrivateLocalLlmBudget = (): PrivateLocalLlmBudget => {
  const val = storage.getString(KEYS.PRIVATE_LOCAL_LLM_BUDGET);
  if (val && PRIVATE_LLM_BUDGET_SET.has(val)) {
    return val as PrivateLocalLlmBudget;
  }
  return 'balanced';
};

const getStoredCloudAiThirdPartyConsentAccepted = (): boolean => {
  return storage.getString(KEYS.CLOUD_AI_THIRD_PARTY_CONSENT) === 'true';
};

const getStoredCloudAiKvTtlSeconds = (): number => {
  const raw = storage.getString(KEYS.CLOUD_AI_KV_TTL_SECONDS);
  if (!raw) return CLOUD_AI_KV_TTL_DEFAULT_SECONDS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return CLOUD_AI_KV_TTL_DEFAULT_SECONDS;
  return snapCloudAiKvTtlToChoice(parsed);
};

const getStoredPrivateCapabilityTier = (): PrivateCapabilityTier => {
  const val = storage.getString(KEYS.PRIVATE_CAPABILITY_TIER);

  if (val === 'full' || val === 'limited') return val;

  return 'unavailable';
};

const getStoredWhisperStatuses = (): Partial<Record<WhisperModelVariantId, WhisperModelStatus>> => {
  try {
    const raw = storage.getString(KEYS.WHISPER_STATUSES);

    return raw
      ? (JSON.parse(raw) as Partial<Record<WhisperModelVariantId, WhisperModelStatus>>)
      : {};
  } catch {
    return {};
  }
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  appTheme: getStoredAppTheme(),
  accentColorId: getStoredAccentColorId(),
  appLanguage: getStoredAppLanguage(),
  selectedAIModel: getStoredAIModel(),
  aiModelRoutingMode: getStoredAiModelRoutingMode(),
  selectedLocalAiModel: getStoredLocalAiModel(),
  selectedWhisperModel: getInitialSelectedWhisperModel(),
  selectedWhisperModelFormat: getStoredSelectedWhisperModelFormat(),
  whisperModelWeightsFormat: getStoredWhisperModelWeightsFormat(),
  transcriptionLanguage: getStoredTranscriptionLanguage(),
  summaryStyle: getStoredSummaryStyle(),
  taskStrictness: getStoredTaskStrictness(),
  aiOutputLanguage: getStoredAiOutputLanguage(),
  aiExecutionMode: getStoredAiExecutionMode(),
  privateLocalLlmBudget: getStoredPrivateLocalLlmBudget(),
  privateCapabilityTier: getStoredPrivateCapabilityTier(),
  autoTranscribeOnSave: getStoredAutoTranscribeOnSave(),
  autoAiAfterTranscription: getStoredAutoAiAfterTranscription(),
  autoArchiveEnabled: getStoredAutoArchiveEnabled(),
  autoArchiveAfterDays: getStoredAutoArchiveAfterDays(),
  cloudAiThirdPartyConsentAccepted: getStoredCloudAiThirdPartyConsentAccepted(),
  cloudAiKvTtlSeconds: getStoredCloudAiKvTtlSeconds(),
  whisperModelStatuses: getStoredWhisperStatuses(),
  whisperDownloadProgress: {},
  whisperDownloadBytes: {},
  whisperDownloadPhase: {},
  localLlmModelStatuses: getStoredLocalLlmStatuses(),
  localLlmDownloadProgress: {},
  localLlmDownloadBytes: {},

  setAppTheme: (value: AppTheme) => {
    storage.set(KEYS.APP_THEME, value);
    set({ appTheme: value });
  },

  setAccentColorId: (value) => {
    storage.set(KEYS.ACCENT_COLOR_ID, value);
    set({ accentColorId: value });
  },

  setAppLanguage: (value: AppLanguage) => {
    storage.set(KEYS.APP_LANGUAGE, value);
    set({ appLanguage: value });
  },

  setAIModel: (id: UserSelectableAIModelId) => {
    storage.set(KEYS.AI_MODEL, id);
    set({ selectedAIModel: id });
  },

  setAiModelRoutingMode: (mode: AiModelRoutingMode) => {
    storage.set(KEYS.AI_MODEL_ROUTING_MODE, mode);
    set({ aiModelRoutingMode: mode });
  },

  setLocalAiModel: (id: LocalAiModelId) => {
    storage.set(KEYS.LOCAL_AI_MODEL, id);
    set({ selectedLocalAiModel: id });
  },

  clearLocalAiModelSelection: () => {
    storage.remove(KEYS.LOCAL_AI_MODEL);
    set({ selectedLocalAiModel: null });
  },

  setWhisperModel: (id: WhisperModelId) => {
    storage.set(KEYS.WHISPER_MODEL, id);
    const format = get().whisperModelWeightsFormat;
    storage.set(KEYS.WHISPER_SELECTED_MODEL_FORMAT, format);
    set({ selectedWhisperModel: id, selectedWhisperModelFormat: format });
  },

  setWhisperModelWeightsFormat: (value: WhisperModelWeightsFormat) => {
    const hasActiveDownload = Object.values(get().whisperModelStatuses).some(
      (status) => status === 'downloading',
    );
    if (hasActiveDownload) {
      return;
    }
    storage.set(KEYS.WHISPER_MODEL_WEIGHTS_FORMAT, value);
    set({
      whisperModelWeightsFormat: value,
    });
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

  setPrivateLocalLlmBudget: (value: PrivateLocalLlmBudget) => {
    storage.set(KEYS.PRIVATE_LOCAL_LLM_BUDGET, value);
    set({ privateLocalLlmBudget: value });
  },

  setAiExecutionMode: (value: AiExecutionMode) => {
    const currentState = get();
    const wasPrivate = currentState.aiExecutionMode === 'private_experimental';
    const nextValue = getExperimentalPrivateAiEnabled() ? value : 'smart_hybrid';

    if (!wasPrivate && nextValue === 'private_experimental') {
      storage.set(KEYS.PRIVATE_PREVIOUS_THEME, currentState.appTheme);
      storage.set(KEYS.PRIVATE_PREVIOUS_AUTO_TRANSCRIBE, String(currentState.autoTranscribeOnSave));
      storage.set(KEYS.PRIVATE_PREVIOUS_AUTO_AI, String(currentState.autoAiAfterTranscription));
      storage.set(KEYS.PRIVATE_PREVIOUS_AUTO_ARCHIVE, String(currentState.autoArchiveEnabled));

      // Private mode uses isolated defaults and disables cloud-like automations.
      storage.set(KEYS.AUTO_TRANSCRIBE_ON_SAVE, 'false');
      storage.set(KEYS.AUTO_AI_AFTER_TRANSCRIPTION, 'false');
      storage.set(KEYS.AUTO_ARCHIVE_ENABLED, 'false');
      set({
        aiExecutionMode: nextValue,
        autoTranscribeOnSave: false,
        autoAiAfterTranscription: false,
        autoArchiveEnabled: false,
      });
      storage.set(KEYS.AI_EXECUTION_MODE, nextValue);
      return;
    }

    if (wasPrivate && nextValue !== 'private_experimental') {
      void releaseLocalLlmSession();
      const prevTheme = storage.getString(KEYS.PRIVATE_PREVIOUS_THEME) as AppTheme | undefined;
      const prevAutoTranscribe = storage.getString(KEYS.PRIVATE_PREVIOUS_AUTO_TRANSCRIBE);
      const prevAutoAi = storage.getString(KEYS.PRIVATE_PREVIOUS_AUTO_AI);
      const prevAutoArchive = storage.getString(KEYS.PRIVATE_PREVIOUS_AUTO_ARCHIVE);

      const restoredTheme = prevTheme === 'light' || prevTheme === 'dark' || prevTheme === 'system';
      const restoredAutoTranscribe =
        prevAutoTranscribe == null
          ? currentState.autoTranscribeOnSave
          : prevAutoTranscribe === 'true';
      const restoredAutoAi =
        prevAutoAi == null ? currentState.autoAiAfterTranscription : prevAutoAi === 'true';
      const restoredAutoArchive =
        prevAutoArchive == null ? currentState.autoArchiveEnabled : prevAutoArchive === 'true';

      if (restoredTheme) {
        storage.set(KEYS.APP_THEME, prevTheme);
      }
      storage.set(KEYS.AUTO_TRANSCRIBE_ON_SAVE, String(restoredAutoTranscribe));
      storage.set(KEYS.AUTO_AI_AFTER_TRANSCRIPTION, String(restoredAutoAi));
      storage.set(KEYS.AUTO_ARCHIVE_ENABLED, String(restoredAutoArchive));
      storage.remove(KEYS.PRIVATE_PREVIOUS_THEME);
      storage.remove(KEYS.PRIVATE_PREVIOUS_AUTO_TRANSCRIBE);
      storage.remove(KEYS.PRIVATE_PREVIOUS_AUTO_AI);
      storage.remove(KEYS.PRIVATE_PREVIOUS_AUTO_ARCHIVE);

      set({
        aiExecutionMode: nextValue,
        ...(restoredTheme ? { appTheme: prevTheme } : {}),
        autoTranscribeOnSave: restoredAutoTranscribe,
        autoAiAfterTranscription: restoredAutoAi,
        autoArchiveEnabled: restoredAutoArchive,
      });
      storage.set(KEYS.AI_EXECUTION_MODE, nextValue);
      return;
    }

    storage.set(KEYS.AI_EXECUTION_MODE, nextValue);
    set({ aiExecutionMode: nextValue });
  },

  reconcileAiExecutionModeAfterRemoteConfig: () => {
    if (!getExperimentalPrivateAiEnabled() && get().aiExecutionMode === 'private_experimental') {
      get().setAiExecutionMode('smart_hybrid');
    }
  },

  setPrivateCapabilityTier: (value: PrivateCapabilityTier) => {
    storage.set(KEYS.PRIVATE_CAPABILITY_TIER, value);
    set({ privateCapabilityTier: value });
  },

  setAutoTranscribeOnSave: (value: boolean) => {
    storage.set(KEYS.AUTO_TRANSCRIBE_ON_SAVE, String(value));
    set({ autoTranscribeOnSave: value });
  },

  setAutoAiAfterTranscription: (value: boolean) => {
    storage.set(KEYS.AUTO_AI_AFTER_TRANSCRIPTION, String(value));
    set({ autoAiAfterTranscription: value });
  },

  setAutoArchiveEnabled: (value: boolean) => {
    storage.set(KEYS.AUTO_ARCHIVE_ENABLED, String(value));
    set({ autoArchiveEnabled: value });
  },

  setAutoArchiveAfterDays: (value: AutoArchiveAfterDays) => {
    storage.set(KEYS.AUTO_ARCHIVE_AFTER_DAYS, String(value));
    set({ autoArchiveAfterDays: value });
  },

  setCloudAiThirdPartyConsentAccepted: (value: boolean) => {
    if (value) {
      storage.set(KEYS.CLOUD_AI_THIRD_PARTY_CONSENT, 'true');
    } else {
      storage.remove(KEYS.CLOUD_AI_THIRD_PARTY_CONSENT);
    }
    set({ cloudAiThirdPartyConsentAccepted: value });
  },

  setCloudAiKvTtlSeconds: (value: number) => {
    const next = snapCloudAiKvTtlToChoice(value);
    storage.set(KEYS.CLOUD_AI_KV_TTL_SECONDS, String(next));
    set({ cloudAiKvTtlSeconds: next });
  },

  setWhisperModelStatus: (
    id: WhisperModelId,
    format: WhisperModelWeightsFormat,
    status: WhisperModelStatus,
  ) => {
    const current = get().whisperModelStatuses;
    const key = getWhisperModelVariantId(id, format);
    const updated = { ...current, [key]: status };

    storage.set(KEYS.WHISPER_STATUSES, JSON.stringify(updated));
    set({ whisperModelStatuses: updated });
  },

  setWhisperModelStatuses: (
    statuses: Partial<Record<WhisperModelVariantId, WhisperModelStatus>>,
  ) => {
    storage.set(KEYS.WHISPER_STATUSES, JSON.stringify(statuses));
    set({ whisperModelStatuses: statuses });
  },

  setDownloadProgress: (
    id: WhisperModelId,
    format: WhisperModelWeightsFormat,
    progress: number,
    bytesWritten?: number,
    contentLength?: number,
    phase?: WhisperDownloadPhase,
  ) => {
    const key = getWhisperModelVariantId(id, format);
    const currentProgress = get().whisperDownloadProgress;
    const currentBytes = get().whisperDownloadBytes;
    const currentPhase = get().whisperDownloadPhase;
    const updatedBytes =
      bytesWritten !== undefined && contentLength !== undefined
        ? { ...currentBytes, [key]: { written: bytesWritten, total: contentLength } }
        : currentBytes;

    const nextPhase = { ...currentPhase };
    if (progress >= 100) {
      delete nextPhase[key];
    } else if (progress <= 0 && phase === undefined) {
      delete nextPhase[key];
    } else if (phase !== undefined) {
      nextPhase[key] = phase;
    }

    set({
      whisperDownloadProgress: { ...currentProgress, [key]: progress },
      whisperDownloadBytes: updatedBytes,
      whisperDownloadPhase: nextPhase,
    });
  },

  removeWhisperModelStatus: (id: WhisperModelId, format: WhisperModelWeightsFormat) => {
    const key = getWhisperModelVariantId(id, format);
    const currentStatuses = get().whisperModelStatuses;
    const currentProgress = get().whisperDownloadProgress;
    const currentBytes = get().whisperDownloadBytes;
    const currentPhase = get().whisperDownloadPhase;

    const updatedStatuses = { ...currentStatuses };
    delete updatedStatuses[key];

    const updatedProgress = { ...currentProgress };
    delete updatedProgress[key];

    const updatedBytes = { ...currentBytes };
    delete updatedBytes[key];

    const updatedPhase = { ...currentPhase };
    delete updatedPhase[key];

    storage.set(KEYS.WHISPER_STATUSES, JSON.stringify(updatedStatuses));
    set({
      whisperModelStatuses: updatedStatuses,
      whisperDownloadProgress: updatedProgress,
      whisperDownloadBytes: updatedBytes,
      whisperDownloadPhase: updatedPhase,
    });
  },

  setLocalLlmModelStatus: (id: LocalAiModelId, status: WhisperModelStatus) => {
    const current = get().localLlmModelStatuses;
    const updated = { ...current, [id]: status };
    storage.set(KEYS.LOCAL_LLM_STATUSES, JSON.stringify(updated));
    set({ localLlmModelStatuses: updated });
  },

  setLocalLlmModelStatuses: (statuses: Partial<Record<LocalAiModelId, WhisperModelStatus>>) => {
    storage.set(KEYS.LOCAL_LLM_STATUSES, JSON.stringify(statuses));
    set({ localLlmModelStatuses: statuses });
  },

  setLocalLlmDownloadProgress: (
    id: LocalAiModelId,
    progress: number,
    bytesWritten?: number,
    contentLength?: number,
  ) => {
    const currentProgress = get().localLlmDownloadProgress;
    const currentBytes = get().localLlmDownloadBytes;
    const updatedBytes =
      bytesWritten !== undefined && contentLength !== undefined
        ? { ...currentBytes, [id]: { written: bytesWritten, total: contentLength } }
        : currentBytes;

    set({
      localLlmDownloadProgress: { ...currentProgress, [id]: progress },
      localLlmDownloadBytes: updatedBytes,
    });
  },

  removeLocalLlmModelStatus: (id: LocalAiModelId) => {
    const currentStatuses = get().localLlmModelStatuses;
    const currentProgress = get().localLlmDownloadProgress;
    const currentBytes = get().localLlmDownloadBytes;

    const updatedStatuses = { ...currentStatuses };
    delete updatedStatuses[id];

    const updatedProgress = { ...currentProgress };
    delete updatedProgress[id];

    const updatedBytes = { ...currentBytes };
    delete updatedBytes[id];

    storage.set(KEYS.LOCAL_LLM_STATUSES, JSON.stringify(updatedStatuses));
    set({
      localLlmModelStatuses: updatedStatuses,
      localLlmDownloadProgress: updatedProgress,
      localLlmDownloadBytes: updatedBytes,
    });
  },
}));
