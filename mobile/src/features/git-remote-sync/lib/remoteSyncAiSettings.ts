import dayjs from 'dayjs';

import { useSettingsStore } from '@/entities/settings';
import { clampPrivateRemoteQueueConcurrency } from '@/entities/settings/lib/privateRemoteQueueConcurrency';
import {
  ALL_SELECTABLE_CLOUD_AI_MODEL_IDS,
  LOCAL_AI_MODELS,
} from '@/entities/settings/model/constants';
import type {
  AiExecutionMode,
  AiModelRoutingMode,
  AiOutputLanguage,
  AutoArchiveAfterDays,
  BackupReminderPeriodDays,
  LocalAiModelId,
  PrivateAiProvider,
  PrivateCapabilityTier,
  PrivateLocalLlmBudget,
  PrivateRemoteOutputBudget,
  PrivateRemoteQueueConcurrency,
  SummaryStyle,
  TaskStrictness,
  TranscriptionLanguage,
  UserSelectableAIModelId,
  WhisperModelId,
  WhisperModelWeightsFormat,
} from '@/entities/settings/model/types';
import { storage } from '@/shared/lib/async-storage';
import { isRecord, isString } from '@/shared/lib/type-guards';

export const REMOTE_SYNC_AI_SETTINGS_VERSION = 1 as const;

const PRIVATE_PREVIOUS_AUTO_AI_KEY = 'settings.private.previousAutoAiAfterTranscription';

export type RemoteSyncAiSettingsPayload = {
  version: typeof REMOTE_SYNC_AI_SETTINGS_VERSION;
  exportedAt: string;
  transcriptionLanguage: TranscriptionLanguage;
  selectedWhisperModel: WhisperModelId;
  whisperModelWeightsFormat: WhisperModelWeightsFormat;
  selectedWhisperModelFormat: WhisperModelWeightsFormat;
  summaryStyle: SummaryStyle;
  taskStrictness: TaskStrictness;
  aiOutputLanguage: AiOutputLanguage;
  aiExecutionMode: AiExecutionMode;
  selectedAIModel: UserSelectableAIModelId;
  aiModelRoutingMode: AiModelRoutingMode;
  selectedLocalAiModel: LocalAiModelId | null;
  privateLocalLlmBudget: PrivateLocalLlmBudget;
  privateRemoteOutputBudget: PrivateRemoteOutputBudget;
  privateRemotePreferJsonObject: boolean;
  privateRemoteQueueConcurrency: PrivateRemoteQueueConcurrency;
  privateCapabilityTier: PrivateCapabilityTier;
  privateAiProvider: PrivateAiProvider;
  privateRemoteBaseUrl: string;
  privateRemoteModel: string;
  privateRemoteActiveProfileId: string | null;
  showSummaryReasoningInNotes: boolean;
  autoRefreshMeetingSpeakersOnRegen: boolean;
  autoTranscribeOnSave: boolean;
  autoAiAfterTranscription: boolean;
  privateAutoAiAfterTranscription: boolean;
  autoArchiveEnabled: boolean;
  autoArchiveAfterDays: AutoArchiveAfterDays;
  taskDeadlineNotificationsEnabled: boolean;
  backupReminderNotificationsEnabled: boolean;
  backupReminderPeriodDays: BackupReminderPeriodDays;
  aiProcessingAlertsEnabled: boolean;
};

const TRANSCRIPTION_LANGUAGES = new Set<TranscriptionLanguage>([
  'auto',
  'ru',
  'en',
  'de',
  'fr',
  'es',
  'zh',
  'ja',
]);
const SUMMARY_STYLES = new Set<SummaryStyle>(['brief', 'standard', 'detailed']);
const TASK_STRICTNESS = new Set<TaskStrictness>(['strict', 'balanced', 'soft']);
const AI_OUTPUT_LANGUAGES = new Set<AiOutputLanguage>(['same', 'ru', 'en']);
const AI_EXECUTION_MODES = new Set<AiExecutionMode>(['smart_hybrid', 'private_experimental']);
const AI_ROUTING_MODES = new Set<AiModelRoutingMode>(['manual', 'auto']);
const WHISPER_MODELS = new Set<WhisperModelId>([
  'whisper-tiny',
  'whisper-base',
  'whisper-small',
  'whisper-medium',
]);
const WHISPER_FORMATS = new Set<WhisperModelWeightsFormat>(['q5_1', 'full']);
const LOCAL_BUDGETS = new Set<PrivateLocalLlmBudget>(['efficient', 'balanced', 'expanded']);
const REMOTE_BUDGETS = new Set<PrivateRemoteOutputBudget>([
  'efficient',
  'balanced',
  'expanded',
  'unlimited',
]);
const CAPABILITY_TIERS = new Set<PrivateCapabilityTier>(['full', 'limited', 'unavailable']);
const PRIVATE_PROVIDERS = new Set<PrivateAiProvider>(['local', 'custom_openai']);
const ARCHIVE_DAYS = new Set<AutoArchiveAfterDays>([1, 7, 14, 30]);
const BACKUP_REMINDER_DAYS = new Set<BackupReminderPeriodDays>([7, 14, 30]);
const CLOUD_AI_MODELS = new Set<UserSelectableAIModelId>(ALL_SELECTABLE_CLOUD_AI_MODEL_IDS);
const LOCAL_AI_MODEL_IDS = new Set<LocalAiModelId>(LOCAL_AI_MODELS.map((model) => model.id));

function readBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readEnum<T extends string>(value: unknown, allowed: Set<T>, fallback: T): T {
  return isString(value) && allowed.has(value as T) ? (value as T) : fallback;
}

function readOptionalEnum<T extends string>(value: unknown, allowed: Set<T>): T | null | undefined {
  if (value === null) return null;
  return isString(value) && allowed.has(value as T) ? (value as T) : undefined;
}

function readArchiveDays(value: unknown, fallback: AutoArchiveAfterDays): AutoArchiveAfterDays {
  const n = typeof value === 'number' ? value : Number(value);
  return ARCHIVE_DAYS.has(n as AutoArchiveAfterDays) ? (n as AutoArchiveAfterDays) : fallback;
}

function readBackupReminderDays(
  value: unknown,
  fallback: BackupReminderPeriodDays,
): BackupReminderPeriodDays {
  const n = typeof value === 'number' ? value : Number(value);
  return BACKUP_REMINDER_DAYS.has(n as BackupReminderPeriodDays)
    ? (n as BackupReminderPeriodDays)
    : fallback;
}

function readQueueConcurrency(
  value: unknown,
  fallback: PrivateRemoteQueueConcurrency,
): PrivateRemoteQueueConcurrency {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return clampPrivateRemoteQueueConcurrency(n);
}

function readSmartAutoAiForSync(
  aiExecutionMode: AiExecutionMode,
  autoAiAfterTranscription: boolean,
): boolean {
  if (aiExecutionMode === 'smart_hybrid') {
    return autoAiAfterTranscription;
  }
  const previous = storage.getString(PRIVATE_PREVIOUS_AUTO_AI_KEY);
  if (previous != null) {
    return previous === 'true';
  }
  return autoAiAfterTranscription;
}

function prepareRemoteSyncAutoAiBeforeModeChange(payload: {
  autoAiAfterTranscription: boolean;
  privateAutoAiAfterTranscription: boolean;
}): void {
  const store = useSettingsStore.getState();
  store.setPrivateAutoAiAfterTranscription(payload.privateAutoAiAfterTranscription);

  if (store.aiExecutionMode === 'smart_hybrid') {
    store.setAutoAiAfterTranscription(payload.autoAiAfterTranscription);
  } else {
    storage.set(PRIVATE_PREVIOUS_AUTO_AI_KEY, String(payload.autoAiAfterTranscription));
  }
}

function finalizeRemoteSyncAutoAiAfterModeChange(payload: {
  aiExecutionMode: AiExecutionMode;
  autoAiAfterTranscription: boolean;
  privateAutoAiAfterTranscription: boolean;
}): void {
  if (payload.aiExecutionMode === 'private_experimental') {
    storage.set(PRIVATE_PREVIOUS_AUTO_AI_KEY, String(payload.autoAiAfterTranscription));
    useSettingsStore
      .getState()
      .setAutoAiAfterTranscription(payload.privateAutoAiAfterTranscription);
    return;
  }

  useSettingsStore.getState().setAutoAiAfterTranscription(payload.autoAiAfterTranscription);
}

export function buildRemoteSyncAiSettings(): RemoteSyncAiSettingsPayload {
  const state = useSettingsStore.getState();
  return {
    version: REMOTE_SYNC_AI_SETTINGS_VERSION,
    exportedAt: dayjs().toISOString(),
    transcriptionLanguage: state.transcriptionLanguage,
    selectedWhisperModel: state.selectedWhisperModel,
    whisperModelWeightsFormat: state.whisperModelWeightsFormat,
    selectedWhisperModelFormat: state.selectedWhisperModelFormat,
    summaryStyle: state.summaryStyle,
    taskStrictness: state.taskStrictness,
    aiOutputLanguage: state.aiOutputLanguage,
    aiExecutionMode: state.aiExecutionMode,
    selectedAIModel: state.selectedAIModel,
    aiModelRoutingMode: state.aiModelRoutingMode,
    selectedLocalAiModel: state.selectedLocalAiModel,
    privateLocalLlmBudget: state.privateLocalLlmBudget,
    privateRemoteOutputBudget: state.privateRemoteOutputBudget,
    privateRemotePreferJsonObject: state.privateRemotePreferJsonObject,
    privateRemoteQueueConcurrency: state.privateRemoteQueueConcurrency,
    privateCapabilityTier: state.privateCapabilityTier,
    privateAiProvider: state.privateAiProvider,
    privateRemoteBaseUrl: state.privateRemoteBaseUrl,
    privateRemoteModel: state.privateRemoteModel,
    privateRemoteActiveProfileId: state.privateRemoteActiveProfileId,
    showSummaryReasoningInNotes: state.showSummaryReasoningInNotes,
    autoRefreshMeetingSpeakersOnRegen: state.autoRefreshMeetingSpeakersOnRegen,
    autoTranscribeOnSave: state.autoTranscribeOnSave,
    autoAiAfterTranscription: readSmartAutoAiForSync(
      state.aiExecutionMode,
      state.autoAiAfterTranscription,
    ),
    privateAutoAiAfterTranscription: state.privateAutoAiAfterTranscription,
    autoArchiveEnabled: state.autoArchiveEnabled,
    autoArchiveAfterDays: state.autoArchiveAfterDays,
    taskDeadlineNotificationsEnabled: state.taskDeadlineNotificationsEnabled,
    backupReminderNotificationsEnabled: state.backupReminderNotificationsEnabled,
    backupReminderPeriodDays: state.backupReminderPeriodDays,
    aiProcessingAlertsEnabled: state.aiProcessingAlertsEnabled,
  };
}

export function parseRemoteSyncAiSettings(raw: unknown): RemoteSyncAiSettingsPayload | null {
  if (!isRecord(raw) || raw.version !== REMOTE_SYNC_AI_SETTINGS_VERSION) {
    return null;
  }

  const current = useSettingsStore.getState();
  const selectedLocalAiModel = readOptionalEnum<LocalAiModelId>(
    raw.selectedLocalAiModel,
    LOCAL_AI_MODEL_IDS,
  );

  return {
    version: REMOTE_SYNC_AI_SETTINGS_VERSION,
    exportedAt: isString(raw.exportedAt) ? raw.exportedAt : dayjs().toISOString(),
    transcriptionLanguage: readEnum(
      raw.transcriptionLanguage,
      TRANSCRIPTION_LANGUAGES,
      current.transcriptionLanguage,
    ),
    selectedWhisperModel: readEnum(
      raw.selectedWhisperModel,
      WHISPER_MODELS,
      current.selectedWhisperModel,
    ),
    whisperModelWeightsFormat: readEnum(
      raw.whisperModelWeightsFormat,
      WHISPER_FORMATS,
      current.whisperModelWeightsFormat,
    ),
    selectedWhisperModelFormat: readEnum(
      raw.selectedWhisperModelFormat,
      WHISPER_FORMATS,
      current.selectedWhisperModelFormat,
    ),
    summaryStyle: readEnum(raw.summaryStyle, SUMMARY_STYLES, current.summaryStyle),
    taskStrictness: readEnum(raw.taskStrictness, TASK_STRICTNESS, current.taskStrictness),
    aiOutputLanguage: readEnum(raw.aiOutputLanguage, AI_OUTPUT_LANGUAGES, current.aiOutputLanguage),
    aiExecutionMode: readEnum(raw.aiExecutionMode, AI_EXECUTION_MODES, current.aiExecutionMode),
    selectedAIModel: readEnum(raw.selectedAIModel, CLOUD_AI_MODELS, current.selectedAIModel),
    aiModelRoutingMode: readEnum(
      raw.aiModelRoutingMode,
      AI_ROUTING_MODES,
      current.aiModelRoutingMode,
    ),
    selectedLocalAiModel:
      selectedLocalAiModel === undefined ? current.selectedLocalAiModel : selectedLocalAiModel,
    privateLocalLlmBudget: readEnum(
      raw.privateLocalLlmBudget,
      LOCAL_BUDGETS,
      current.privateLocalLlmBudget,
    ),
    privateRemoteOutputBudget: readEnum(
      raw.privateRemoteOutputBudget,
      REMOTE_BUDGETS,
      current.privateRemoteOutputBudget,
    ),
    privateRemotePreferJsonObject: readBool(
      raw.privateRemotePreferJsonObject,
      current.privateRemotePreferJsonObject,
    ),
    privateRemoteQueueConcurrency: readQueueConcurrency(
      raw.privateRemoteQueueConcurrency,
      current.privateRemoteQueueConcurrency,
    ),
    privateCapabilityTier: readEnum(
      raw.privateCapabilityTier,
      CAPABILITY_TIERS,
      current.privateCapabilityTier,
    ),
    privateAiProvider: readEnum(
      raw.privateAiProvider,
      PRIVATE_PROVIDERS,
      current.privateAiProvider,
    ),
    privateRemoteBaseUrl: isString(raw.privateRemoteBaseUrl)
      ? raw.privateRemoteBaseUrl
      : current.privateRemoteBaseUrl,
    privateRemoteModel: isString(raw.privateRemoteModel)
      ? raw.privateRemoteModel
      : current.privateRemoteModel,
    privateRemoteActiveProfileId:
      raw.privateRemoteActiveProfileId === null
        ? null
        : isString(raw.privateRemoteActiveProfileId)
          ? raw.privateRemoteActiveProfileId
          : current.privateRemoteActiveProfileId,
    showSummaryReasoningInNotes: readBool(
      raw.showSummaryReasoningInNotes,
      current.showSummaryReasoningInNotes,
    ),
    autoRefreshMeetingSpeakersOnRegen: readBool(
      raw.autoRefreshMeetingSpeakersOnRegen,
      current.autoRefreshMeetingSpeakersOnRegen,
    ),
    autoTranscribeOnSave: readBool(raw.autoTranscribeOnSave, current.autoTranscribeOnSave),
    autoAiAfterTranscription: readBool(
      raw.autoAiAfterTranscription,
      readSmartAutoAiForSync(current.aiExecutionMode, current.autoAiAfterTranscription),
    ),
    privateAutoAiAfterTranscription: readBool(
      raw.privateAutoAiAfterTranscription,
      current.privateAutoAiAfterTranscription,
    ),
    autoArchiveEnabled: readBool(raw.autoArchiveEnabled, current.autoArchiveEnabled),
    autoArchiveAfterDays: readArchiveDays(raw.autoArchiveAfterDays, current.autoArchiveAfterDays),
    taskDeadlineNotificationsEnabled: readBool(
      raw.taskDeadlineNotificationsEnabled,
      current.taskDeadlineNotificationsEnabled,
    ),
    backupReminderNotificationsEnabled: readBool(
      raw.backupReminderNotificationsEnabled,
      current.backupReminderNotificationsEnabled,
    ),
    backupReminderPeriodDays: readBackupReminderDays(
      raw.backupReminderPeriodDays,
      current.backupReminderPeriodDays,
    ),
    aiProcessingAlertsEnabled: readBool(
      raw.aiProcessingAlertsEnabled,
      current.aiProcessingAlertsEnabled,
    ),
  };
}

export function applyRemoteSyncAiSettings(payload: RemoteSyncAiSettingsPayload): void {
  const store = useSettingsStore.getState();

  prepareRemoteSyncAutoAiBeforeModeChange({
    autoAiAfterTranscription: payload.autoAiAfterTranscription,
    privateAutoAiAfterTranscription: payload.privateAutoAiAfterTranscription,
  });

  store.setTranscriptionLanguage(payload.transcriptionLanguage);
  store.setWhisperModel(payload.selectedWhisperModel);
  store.setWhisperModelWeightsFormat(payload.whisperModelWeightsFormat);
  store.setSummaryStyle(payload.summaryStyle);
  store.setTaskStrictness(payload.taskStrictness);
  store.setAiOutputLanguage(payload.aiOutputLanguage);
  store.setAiExecutionMode(payload.aiExecutionMode);
  store.setAIModel(payload.selectedAIModel);
  store.setAiModelRoutingMode(payload.aiModelRoutingMode);
  if (payload.selectedLocalAiModel) {
    store.setLocalAiModel(payload.selectedLocalAiModel);
  } else {
    store.clearLocalAiModelSelection();
  }
  store.setPrivateLocalLlmBudget(payload.privateLocalLlmBudget);
  store.setPrivateRemoteOutputBudget(payload.privateRemoteOutputBudget);
  store.setPrivateRemotePreferJsonObject(payload.privateRemotePreferJsonObject);
  store.setPrivateRemoteQueueConcurrency(payload.privateRemoteQueueConcurrency);
  store.setPrivateCapabilityTier(payload.privateCapabilityTier);
  store.setPrivateAiProvider(payload.privateAiProvider);
  store.setPrivateRemoteBaseUrl(payload.privateRemoteBaseUrl);
  store.setPrivateRemoteModel(payload.privateRemoteModel);
  store.setShowSummaryReasoningInNotes(payload.showSummaryReasoningInNotes);
  store.setAutoRefreshMeetingSpeakersOnRegen(payload.autoRefreshMeetingSpeakersOnRegen);
  store.setAutoTranscribeOnSave(payload.autoTranscribeOnSave);
  store.setAutoArchiveEnabled(payload.autoArchiveEnabled);
  store.setAutoArchiveAfterDays(payload.autoArchiveAfterDays);
  store.setTaskDeadlineNotificationsEnabled(payload.taskDeadlineNotificationsEnabled);
  store.setBackupReminderNotificationsEnabled(payload.backupReminderNotificationsEnabled);
  store.setBackupReminderPeriodDays(payload.backupReminderPeriodDays);
  store.setAiProcessingAlertsEnabled(payload.aiProcessingAlertsEnabled);

  if (payload.privateRemoteActiveProfileId) {
    store.setPrivateRemoteActiveProfile(payload.privateRemoteActiveProfileId);
  }

  finalizeRemoteSyncAutoAiAfterModeChange({
    aiExecutionMode: payload.aiExecutionMode,
    autoAiAfterTranscription: payload.autoAiAfterTranscription,
    privateAutoAiAfterTranscription: payload.privateAutoAiAfterTranscription,
  });
}
