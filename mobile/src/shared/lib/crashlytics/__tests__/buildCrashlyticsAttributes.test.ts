import { useSettingsStore } from '@/entities/settings/model/store';
import type { SettingsState } from '@/entities/settings/model/types';

import {
  buildCrashlyticsAttributes,
  settingsSnapshotForCrashlytics,
} from '../buildCrashlyticsAttributes';

jest.mock('@/entities/settings', () => ({
  getAiSettingsDiagnostics: jest.fn(() => ({
    selectedOpenRouterModelId: 'deepseek/deepseek-v4-flash',
    userTier: 'fast',
    displayName: 'DeepSeek V4 Flash',
  })),
}));

jest.mock('@/entities/settings/model/store', () => ({
  useSettingsStore: {
    getState: jest.fn(),
  },
}));

jest.mock('@/features/onboarding/lib/onboardingStorage', () => ({
  getHasSeenOnboarding: jest.fn(() => true),
}));

jest.mock('@/features/pro-license/lib/proEntitlementStorage', () => ({
  isProActiveFromStorageSync: jest.fn(() => false),
}));

jest.mock('@/features/transcription/lib/devicePerformanceProfile', () => ({
  getDevicePerformanceProfile: jest.fn(() => ({
    tier: 'high',
    optimalChunkDurationSec: 30,
    optimalChunkOverlapSec: 2,
    checkpointIntervalMs: 1000,
    contextRecycleChunks: 4,
  })),
}));

jest.mock('@/shared/config/buildEnv', () => ({
  getNodeEnv: jest.fn(() => 'production'),
  isInternalDebugBuild: jest.fn(() => false),
}));

jest.mock('@/shared/config/webApiEnvironment', () => ({
  getWebApiEnvironmentStatus: jest.fn(() => 'production'),
}));

jest.mock('@/shared/lib/platform', () => ({
  IS_IOS: true,
  IS_ANDROID: false,
}));

jest.mock('react-native-nitro-device-info', () => ({
  DeviceInfoModule: {
    version: '1.2.3',
    buildNumber: '456',
    systemVersion: '18.0',
    brand: 'Apple',
    model: 'iPhone',
    isLowRamDevice: false,
  },
}));

const useSettingsStoreMock = useSettingsStore as unknown as {
  getState: jest.Mock;
};

function makeSettings(overrides: Partial<SettingsState> = {}): SettingsState {
  return {
    appTheme: 'system',
    accentColorId: 'default',
    appLanguage: 'en',
    selectedAIModel: 'deepseek/deepseek-v4-flash',
    aiModelRoutingMode: 'auto',
    selectedLocalAiModel: null,
    selectedWhisperModel: 'whisper-small',
    selectedWhisperModelFormat: 'q5_1',
    whisperModelWeightsFormat: 'q5_1',
    transcriptionLanguage: 'auto',
    transcriptionQualityMode: 'balanced',
    iosWhisperKitEngineEnabled: true,
    transcriptionDiarizationEnabled: false,
    transcriptionCustomWords: [],
    summaryStyle: 'standard',
    taskStrictness: 'balanced',
    aiOutputLanguage: 'same',
    aiExecutionMode: 'smart_hybrid',
    privateLocalLlmBudget: 'balanced',
    privateRemoteOutputBudget: 'balanced',
    privateRemotePreferJsonObject: true,
    privateRemoteQueueConcurrency: 1,
    privateCapabilityTier: 'full',
    privateAiProvider: 'local',
    privateRemoteBaseUrl: '',
    privateRemoteApiKey: '',
    privateRemoteModel: '',
    privateRemoteLastSuccessfulBaseUrl: '',
    privateRemoteLastSuccessfulApiKey: '',
    privateRemoteLastSuccessfulModel: '',
    privateRemoteProfiles: [],
    privateRemoteActiveProfileId: null,
    autoTranscribeOnSave: true,
    autoAiAfterTranscription: false,
    privateAutoAiAfterTranscription: false,
    autoArchiveEnabled: false,
    autoArchiveAfterDays: 7,
    shakeToRecordEnabled: true,
    shakeToCancelAskAiEnabled: true,
    taskDeadlineNotificationsEnabled: true,
    backupReminderNotificationsEnabled: false,
    backupReminderPeriodDays: 14,
    aiProcessingAlertsEnabled: true,
    transcriptionRecoveryNotificationsEnabled: true,
    appLockRecordingNotificationsEnabled: true,
    cloudAiThirdPartyConsentAccepted: true,
    cloudAiKvTtlSeconds: 3600,
    showSummaryReasoningInNotes: false,
    autoRefreshMeetingSpeakersOnRegen: true,
    whisperModelStatuses: {},
    whisperDownloadProgress: {},
    whisperDownloadBytes: {},
    whisperDownloadPhase: {},
    localLlmModelStatuses: {},
    localLlmDownloadProgress: {},
    localLlmDownloadBytes: {},
    customLocalAiModels: [],
    setAppTheme: jest.fn(),
    setAccentColorId: jest.fn(),
    setAppLanguage: jest.fn(),
    setAIModel: jest.fn(),
    setAiModelRoutingMode: jest.fn(),
    setLocalAiModel: jest.fn(),
    clearLocalAiModelSelection: jest.fn(),
    setWhisperModel: jest.fn(),
    setWhisperModelWeightsFormat: jest.fn(),
    setTranscriptionLanguage: jest.fn(),
    setTranscriptionQualityMode: jest.fn(),
    setIosWhisperKitEngineEnabled: jest.fn(),
    setTranscriptionDiarizationEnabled: jest.fn(),
    setTranscriptionCustomWords: jest.fn(),
    setSummaryStyle: jest.fn(),
    setTaskStrictness: jest.fn(),
    setAiOutputLanguage: jest.fn(),
    setAiExecutionMode: jest.fn(),
    setPrivateLocalLlmBudget: jest.fn(),
    setPrivateRemoteOutputBudget: jest.fn(),
    setPrivateRemotePreferJsonObject: jest.fn(),
    setPrivateRemoteQueueConcurrency: jest.fn(),
    setPrivateCapabilityTier: jest.fn(),
    setPrivateAiProvider: jest.fn(),
    setPrivateRemoteBaseUrl: jest.fn(),
    setPrivateRemoteApiKey: jest.fn(),
    setPrivateRemoteModel: jest.fn(),
    setPrivateRemoteLastSuccessfulConfig: jest.fn(),
    upsertPrivateRemoteProfile: jest.fn(),
    setPrivateRemoteActiveProfile: jest.fn(),
    removePrivateRemoteProfile: jest.fn(),
    setAutoTranscribeOnSave: jest.fn(),
    setAutoAiAfterTranscription: jest.fn(),
    setPrivateAutoAiAfterTranscription: jest.fn(),
    setAutoArchiveEnabled: jest.fn(),
    setAutoArchiveAfterDays: jest.fn(),
    setShakeToRecordEnabled: jest.fn(),
    setShakeToCancelAskAiEnabled: jest.fn(),
    setTaskDeadlineNotificationsEnabled: jest.fn(),
    setBackupReminderNotificationsEnabled: jest.fn(),
    setBackupReminderPeriodDays: jest.fn(),
    setAiProcessingAlertsEnabled: jest.fn(),
    setTranscriptionRecoveryNotificationsEnabled: jest.fn(),
    setAppLockRecordingNotificationsEnabled: jest.fn(),
    setCloudAiThirdPartyConsentAccepted: jest.fn(),
    setCloudAiKvTtlSeconds: jest.fn(),
    setShowSummaryReasoningInNotes: jest.fn(),
    setAutoRefreshMeetingSpeakersOnRegen: jest.fn(),
    setWhisperModelStatus: jest.fn(),
    setWhisperModelStatuses: jest.fn(),
    setDownloadProgress: jest.fn(),
    removeWhisperModelStatus: jest.fn(),
    setLocalLlmModelStatus: jest.fn(),
    setLocalLlmModelStatuses: jest.fn(),
    setLocalLlmDownloadProgress: jest.fn(),
    removeLocalLlmModelStatus: jest.fn(),
    addCustomLocalAiModel: jest.fn(),
    removeCustomLocalAiModel: jest.fn(),
    ...overrides,
  };
}

describe('buildCrashlyticsAttributes', () => {
  beforeEach(() => {
    useSettingsStoreMock.getState.mockReset();
    useSettingsStoreMock.getState.mockReturnValue(makeSettings());
  });

  it('maps support-relevant settings without secrets', () => {
    const attrs = buildCrashlyticsAttributes();

    expect(attrs).toMatchObject({
      platform: 'ios',
      app_version: '1.2.3',
      build_number: '456',
      web_api_env: 'production',
      ai_execution_mode: 'smart_hybrid',
      cloud_ai_model: 'deepseek/deepseek-v4-flash',
      ai_user_tier: 'fast',
      whisper_model: 'whisper-small',
      private_remote_configured: 'no',
      cloud_ai_consent: 'yes',
    });
    expect(attrs).not.toHaveProperty('private_remote_base_url');
    expect(attrs).not.toHaveProperty('privateRemoteApiKey');
  });

  it('flags configured private remote without exposing the URL', () => {
    useSettingsStoreMock.getState.mockReturnValue(
      makeSettings({
        privateRemoteBaseUrl: 'https://ai.example.com/v1',
      }),
    );

    expect(buildCrashlyticsAttributes().private_remote_configured).toBe('yes');
    expect(JSON.stringify(buildCrashlyticsAttributes())).not.toContain('ai.example.com');
  });
});

describe('settingsSnapshotForCrashlytics', () => {
  it('ignores whisper download progress fields', () => {
    const settings = makeSettings({
      whisperDownloadProgress: { 'whisper-small:q5_1': 42 },
    });

    const snapshot = settingsSnapshotForCrashlytics(settings);

    expect(snapshot).not.toHaveProperty('whisperDownloadProgress');
    expect(snapshot.selectedWhisperModel).toBe('whisper-small');
  });
});
