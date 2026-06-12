import { useSettingsStore } from '@/entities/settings';

import { applyRemoteSyncAiSettings, parseRemoteSyncAiSettings } from '../remoteSyncAiSettings';

jest.mock('@/entities/settings', () => ({
  useSettingsStore: {
    getState: jest.fn(),
  },
}));

const mockGetState = jest.mocked(useSettingsStore.getState);

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
} as const;

describe('remoteSyncAiSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetState.mockReturnValue(baseState as ReturnType<typeof useSettingsStore.getState>);
  });

  it('parses and applies transcription and automation settings', () => {
    const setTranscriptionLanguage = jest.fn();
    const setAutoArchiveAfterDays = jest.fn();
    const setAutoTranscribeOnSave = jest.fn();
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
      setPrivateCapabilityTier: jest.fn(),
      setPrivateAiProvider: jest.fn(),
      setPrivateRemoteBaseUrl: jest.fn(),
      setPrivateRemoteModel: jest.fn(),
      setShowSummaryReasoningInNotes: jest.fn(),
      setAutoRefreshMeetingSpeakersOnRegen: jest.fn(),
      setAutoTranscribeOnSave,
      setAutoAiAfterTranscription: jest.fn(),
      setAutoArchiveEnabled: jest.fn(),
      setAutoArchiveAfterDays,
      setTaskDeadlineNotificationsEnabled: jest.fn(),
      setBackupReminderNotificationsEnabled: jest.fn(),
      setBackupReminderPeriodDays: jest.fn(),
      setAiProcessingAlertsEnabled: jest.fn(),
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
      privateCapabilityTier: 'full',
      privateAiProvider: 'custom_openai',
      privateRemoteBaseUrl: 'http://127.0.0.1:11434',
      privateRemoteModel: 'qwen2.5:7b-instruct',
      privateRemoteActiveProfileId: null,
      showSummaryReasoningInNotes: false,
      autoRefreshMeetingSpeakersOnRegen: true,
      autoTranscribeOnSave: true,
      autoAiAfterTranscription: false,
      autoArchiveEnabled: true,
      autoArchiveAfterDays: 7,
      taskDeadlineNotificationsEnabled: false,
      backupReminderNotificationsEnabled: true,
      backupReminderPeriodDays: 30,
      aiProcessingAlertsEnabled: false,
    });

    expect(payload?.transcriptionLanguage).toBe('ru');
    applyRemoteSyncAiSettings(payload!);
    expect(setTranscriptionLanguage).toHaveBeenCalledWith('ru');
    expect(setAutoArchiveAfterDays).toHaveBeenCalledWith(7);
    expect(setAutoTranscribeOnSave).toHaveBeenCalledWith(true);
  });
});
