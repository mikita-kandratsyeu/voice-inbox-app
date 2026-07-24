import { useSettingsStore } from '@/entities/settings';

jest.mock('@/shared/lib/async-storage', () => {
  const map = new Map<string, string>();
  (globalThis as { __remoteSyncTestStorageMap?: Map<string, string> }).__remoteSyncTestStorageMap =
    map;
  return {
    storage: {
      getString: (key: string) => map.get(key),
      set: (key: string, value: string) => {
        map.set(key, value);
      },
      remove: (key: string) => {
        map.delete(key);
      },
      contains: (key: string) => map.has(key),
    },
  };
});

import {
  applyRemoteSyncAiSettings,
  buildRemoteSyncAiSettings,
  parseRemoteSyncAiSettings,
} from '../remoteSyncAiSettings';

jest.mock('@/entities/settings', () => ({
  useSettingsStore: {
    getState: jest.fn(),
  },
}));

const mockGetState = jest.mocked(useSettingsStore.getState);
const testStorageMap = (
  globalThis as unknown as { __remoteSyncTestStorageMap: Map<string, string> }
).__remoteSyncTestStorageMap;

const baseState = {
  transcriptionLanguage: 'auto',
  selectedWhisperModel: 'whisper-base',
  whisperModelWeightsFormat: 'q5_1',
  selectedWhisperModelFormat: 'q5_1',
  summaryStyle: 'standard',
  taskStrictness: 'balanced',
  aiOutputLanguage: 'same',
  aiExecutionMode: 'smart_hybrid',
  selectedAIModel: 'google/gemini-3.1-flash-lite',
  aiModelRoutingMode: 'auto',
  selectedLocalAiModel: null,
  privateLocalLlmBudget: 'balanced',
  privateRemoteOutputBudget: 'balanced',
  privateRemotePreferJsonObject: false,
  privateRemoteQueueConcurrency: 1,
  privateCapabilityTier: 'full',
  privateAiProvider: 'local',
  privateRemoteBaseUrl: '',
  privateRemoteModel: '',
  privateRemoteActiveProfileId: null,
  showSummaryReasoningInNotes: true,
  autoRefreshMeetingSpeakersOnRegen: false,
  autoTranscribeOnSave: false,
  autoAiAfterTranscription: false,
  privateAutoAiAfterTranscription: false,
  autoArchiveEnabled: false,
  autoArchiveAfterDays: 14,
  shakeToRecordEnabled: true,
  shakeToCancelAskAiEnabled: true,
  taskDeadlineNotificationsEnabled: true,
  backupReminderNotificationsEnabled: false,
  backupReminderPeriodDays: 14,
  aiProcessingAlertsEnabled: true,
  transcriptionRecoveryNotificationsEnabled: true,
  appLockRecordingNotificationsEnabled: true,
} as const;

describe('remoteSyncAiSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testStorageMap.clear();
    mockGetState.mockReturnValue(baseState as ReturnType<typeof useSettingsStore.getState>);
  });

  it('exports queue concurrency in ai settings payload', () => {
    mockGetState.mockReturnValue({
      ...baseState,
      privateRemoteQueueConcurrency: 4,
    } as ReturnType<typeof useSettingsStore.getState>);

    expect(buildRemoteSyncAiSettings().privateRemoteQueueConcurrency).toBe(4);
  });

  it('exports shake to cancel ask ai preference in ai settings payload', () => {
    mockGetState.mockReturnValue({
      ...baseState,
      shakeToCancelAskAiEnabled: false,
    } as ReturnType<typeof useSettingsStore.getState>);

    expect(buildRemoteSyncAiSettings().shakeToCancelAskAiEnabled).toBe(false);
  });

  it('exports shake to record preference in ai settings payload', () => {
    mockGetState.mockReturnValue({
      ...baseState,
      shakeToRecordEnabled: false,
    } as ReturnType<typeof useSettingsStore.getState>);

    expect(buildRemoteSyncAiSettings().shakeToRecordEnabled).toBe(false);
  });

  it('parses and applies transcription and automation settings', () => {
    const setTranscriptionLanguage = jest.fn();
    const setAutoArchiveAfterDays = jest.fn();
    const setAutoTranscribeOnSave = jest.fn();
    const setShakeToRecordEnabled = jest.fn();
    const setShakeToCancelAskAiEnabled = jest.fn();
    const setPrivateAutoAiAfterTranscription = jest.fn();
    const setAutoAiAfterTranscription = jest.fn();
    const setPrivateRemoteQueueConcurrency = jest.fn();
    mockGetState.mockReturnValue({
      ...baseState,
      setTranscriptionLanguage,
      setWhisperModel: jest.fn(),
      setWhisperModelWeightsFormat: jest.fn(),
      setSummaryStyle: jest.fn(),
      setTaskStrictness: jest.fn(),
      setAiOutputLanguage: jest.fn(),
      setAiExecutionMode: jest.fn(),
      setAIModel: jest.fn(),
      setAiModelRoutingMode: jest.fn(),
      setLocalAiModel: jest.fn(),
      clearLocalAiModelSelection: jest.fn(),
      setPrivateLocalLlmBudget: jest.fn(),
      setPrivateRemoteOutputBudget: jest.fn(),
      setPrivateRemotePreferJsonObject: jest.fn(),
      setPrivateRemoteQueueConcurrency,
      setPrivateCapabilityTier: jest.fn(),
      setPrivateAiProvider: jest.fn(),
      setPrivateRemoteBaseUrl: jest.fn(),
      setPrivateRemoteModel: jest.fn(),
      setShowSummaryReasoningInNotes: jest.fn(),
      setAutoRefreshMeetingSpeakersOnRegen: jest.fn(),
      setAutoTranscribeOnSave,
      setShakeToRecordEnabled,
      setShakeToCancelAskAiEnabled,
      setPrivateAutoAiAfterTranscription,
      setAutoAiAfterTranscription,
      setAutoArchiveEnabled: jest.fn(),
      setAutoArchiveAfterDays,
      setTaskDeadlineNotificationsEnabled: jest.fn(),
      setBackupReminderNotificationsEnabled: jest.fn(),
      setBackupReminderPeriodDays: jest.fn(),
      setAiProcessingAlertsEnabled: jest.fn(),
      setTranscriptionRecoveryNotificationsEnabled: jest.fn(),
      setAppLockRecordingNotificationsEnabled: jest.fn(),
      setPrivateRemoteActiveProfile: jest.fn(),
    } as unknown as ReturnType<typeof useSettingsStore.getState>);

    const payload = parseRemoteSyncAiSettings({
      version: 1,
      exportedAt: '2026-06-10T12:00:00.000Z',
      transcriptionLanguage: 'ru',
      selectedWhisperModel: 'whisper-small',
      whisperModelWeightsFormat: 'q5_1',
      selectedWhisperModelFormat: 'q5_1',
      summaryStyle: 'brief',
      taskStrictness: 'strict',
      aiOutputLanguage: 'ru',
      aiExecutionMode: 'smart_hybrid',
      selectedAIModel: 'google/gemini-3.1-flash-lite',
      aiModelRoutingMode: 'manual',
      selectedLocalAiModel: null,
      privateLocalLlmBudget: 'efficient',
      privateRemoteOutputBudget: 'unlimited',
      privateRemotePreferJsonObject: true,
      privateRemoteQueueConcurrency: 3,
      privateCapabilityTier: 'full',
      privateAiProvider: 'custom_openai',
      privateRemoteBaseUrl: 'http://127.0.0.1:11434',
      privateRemoteModel: 'qwen2.5:7b-instruct',
      privateRemoteActiveProfileId: null,
      showSummaryReasoningInNotes: false,
      autoRefreshMeetingSpeakersOnRegen: true,
      autoTranscribeOnSave: true,
      autoAiAfterTranscription: true,
      privateAutoAiAfterTranscription: true,
      autoArchiveEnabled: true,
      autoArchiveAfterDays: 7,
      shakeToRecordEnabled: false,
      shakeToCancelAskAiEnabled: false,
      taskDeadlineNotificationsEnabled: false,
      backupReminderNotificationsEnabled: true,
      backupReminderPeriodDays: 30,
      aiProcessingAlertsEnabled: false,
    });

    expect(payload?.transcriptionLanguage).toBe('ru');
    expect(payload?.privateRemoteQueueConcurrency).toBe(3);
    applyRemoteSyncAiSettings(payload!);
    expect(setTranscriptionLanguage).toHaveBeenCalledWith('ru');
    expect(setAutoArchiveAfterDays).toHaveBeenCalledWith(7);
    expect(setAutoTranscribeOnSave).toHaveBeenCalledWith(true);
    expect(setShakeToRecordEnabled).toHaveBeenCalledWith(false);
    expect(setShakeToCancelAskAiEnabled).toHaveBeenCalledWith(false);
    expect(setPrivateAutoAiAfterTranscription).toHaveBeenCalledWith(true);
    expect(setAutoAiAfterTranscription).toHaveBeenCalledWith(true);
    expect(setPrivateRemoteQueueConcurrency).toHaveBeenCalledWith(3);
  });

  it('exports smart auto-summary from private snapshot while in private mode', () => {
    testStorageMap.set('settings.private.previousAutoAiAfterTranscription', 'true');
    mockGetState.mockReturnValue({
      ...baseState,
      aiExecutionMode: 'private_experimental',
      autoAiAfterTranscription: false,
      privateAutoAiAfterTranscription: true,
    } as ReturnType<typeof useSettingsStore.getState>);

    const payload = buildRemoteSyncAiSettings();
    expect(payload.autoAiAfterTranscription).toBe(true);
    expect(payload.privateAutoAiAfterTranscription).toBe(true);
  });

  it('falls back to current private auto-summary when field is missing in export', () => {
    mockGetState.mockReturnValue({
      ...baseState,
      privateAutoAiAfterTranscription: true,
    } as ReturnType<typeof useSettingsStore.getState>);

    const payload = parseRemoteSyncAiSettings({
      version: 1,
      exportedAt: '2026-06-10T12:00:00.000Z',
      transcriptionLanguage: 'auto',
      selectedWhisperModel: 'whisper-base',
      whisperModelWeightsFormat: 'q5_1',
      selectedWhisperModelFormat: 'q5_1',
      summaryStyle: 'standard',
      taskStrictness: 'balanced',
      aiOutputLanguage: 'same',
      aiExecutionMode: 'private_experimental',
      selectedAIModel: 'google/gemini-3.1-flash-lite',
      aiModelRoutingMode: 'auto',
      selectedLocalAiModel: null,
      privateLocalLlmBudget: 'balanced',
      privateRemoteOutputBudget: 'balanced',
      privateRemotePreferJsonObject: false,
      privateCapabilityTier: 'full',
      privateAiProvider: 'local',
      privateRemoteBaseUrl: '',
      privateRemoteModel: '',
      privateRemoteActiveProfileId: null,
      showSummaryReasoningInNotes: true,
      autoRefreshMeetingSpeakersOnRegen: false,
      autoTranscribeOnSave: false,
      autoAiAfterTranscription: false,
      autoArchiveEnabled: false,
      autoArchiveAfterDays: 14,
      taskDeadlineNotificationsEnabled: true,
      backupReminderNotificationsEnabled: false,
      backupReminderPeriodDays: 14,
      aiProcessingAlertsEnabled: true,
    });

    expect(payload?.privateAutoAiAfterTranscription).toBe(true);
  });

  it('falls back to current queue concurrency when field is missing in export', () => {
    mockGetState.mockReturnValue({
      ...baseState,
      privateRemoteQueueConcurrency: 2,
    } as ReturnType<typeof useSettingsStore.getState>);

    const payload = parseRemoteSyncAiSettings({
      version: 1,
      exportedAt: '2026-06-10T12:00:00.000Z',
      transcriptionLanguage: 'auto',
      selectedWhisperModel: 'whisper-base',
      whisperModelWeightsFormat: 'q5_1',
      selectedWhisperModelFormat: 'q5_1',
      summaryStyle: 'standard',
      taskStrictness: 'balanced',
      aiOutputLanguage: 'same',
      aiExecutionMode: 'smart_hybrid',
      selectedAIModel: 'google/gemini-3.1-flash-lite',
      aiModelRoutingMode: 'auto',
      selectedLocalAiModel: null,
      privateLocalLlmBudget: 'balanced',
      privateRemoteOutputBudget: 'balanced',
      privateRemotePreferJsonObject: false,
      privateCapabilityTier: 'full',
      privateAiProvider: 'local',
      privateRemoteBaseUrl: '',
      privateRemoteModel: '',
      privateRemoteActiveProfileId: null,
      showSummaryReasoningInNotes: true,
      autoRefreshMeetingSpeakersOnRegen: false,
      autoTranscribeOnSave: false,
      autoAiAfterTranscription: false,
      autoArchiveEnabled: false,
      autoArchiveAfterDays: 14,
      taskDeadlineNotificationsEnabled: true,
      backupReminderNotificationsEnabled: false,
      backupReminderPeriodDays: 14,
      aiProcessingAlertsEnabled: true,
    });

    expect(payload?.privateRemoteQueueConcurrency).toBe(2);
  });
});
