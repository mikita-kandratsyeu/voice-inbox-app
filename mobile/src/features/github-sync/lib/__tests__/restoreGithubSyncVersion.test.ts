jest.mock('@/shared/lib/async-storage', () => ({
  storage: {
    getString: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn(() => false),
  },
}));

jest.mock('@/shared/lib/folderColor', () => ({
  DEFAULT_FOLDER_BRAND_HEX: '#3b82f6',
}));

jest.mock('@/entities/settings', () => ({
  useSettingsStore: {
    getState: jest.fn(() => ({
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
      privateRemoteProfiles: [],
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
    })),
  },
}));

jest.mock('@/features/sync-data', () => {
  const backupMetadata = jest.requireActual('@/features/sync-data/lib/backupMetadata');
  const buildImport = jest.requireActual('@/features/sync-data/lib/buildImportResultFromPayload');
  return {
    parseBackupMetadataPayload: backupMetadata.parseBackupMetadataPayload,
    buildImportResultFromPayload: buildImport.buildImportResultFromPayload,
  };
});

import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';

jest.mock('@/features/pro-license/lib/proEntitlementStorage', () => ({
  isProActiveFromStorageSync: jest.fn(() => true),
}));

import { getFileContentAtRef } from '../githubApi';
import { restoreGithubSyncVersion } from '../restoreGithubSyncVersion';

jest.mock('../githubApi', () => ({
  getFileContentAtRef: jest.fn(),
}));

const mockGetFileContentAtRef = jest.mocked(getFileContentAtRef);
const mockIsProActiveFromStorageSync = jest.mocked(isProActiveFromStorageSync);

const manifest = {
  version: 4,
  exportedAt: '2026-06-10T12:00:00.000Z',
  folders: [{ id: 'f1', name: 'Work', color: '#111111', icon: 'briefcase', sortOrder: 0 }],
  records: [
    {
      id: 'rec-1',
      createdAt: '2026-06-01T10:00:00.000Z',
      title: 'Meeting',
      audioPath: '/tmp/audio.m4a',
    },
  ],
  graphLayouts: [],
};

describe('restoreGithubSyncVersion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds import result from manifest at commit', async () => {
    mockGetFileContentAtRef.mockResolvedValue(JSON.stringify(manifest));

    const result = await restoreGithubSyncVersion({
      secrets: {
        accessToken: 'token',
        owner: 'octocat',
        repo: 'notes',
        branch: 'voice-inbox-ai',
        basePath: 'voice-inbox-ai',
      },
      commitSha: 'abc123',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.importResult.success).toBe(true);
    expect(result.importResult.records).toHaveLength(1);
    expect(result.importResult.records[0]).toMatchObject({
      id: 'rec-1',
      title: 'Meeting',
    });
    expect(result.importResult.records[0]).not.toHaveProperty('audioPath');
    expect(result.auxiliaryData).toEqual({
      aiSettings: null,
      privateRemoteProfiles: null,
    });
    expect(mockGetFileContentAtRef).toHaveBeenNthCalledWith(
      1,
      'token',
      'octocat',
      'notes',
      'voice-inbox-ai/.voice-inbox-ai/manifest.json',
      'abc123',
    );
  });

  it('parses auxiliary ai settings and private profiles when present', async () => {
    mockGetFileContentAtRef.mockImplementation(async (...args) => {
      const path = args[3];
      if (path === 'voice-inbox-ai/.voice-inbox-ai/manifest.json') {
        return JSON.stringify(manifest);
      }
      if (path === 'voice-inbox-ai/.voice-inbox-ai/ai-settings.json') {
        return JSON.stringify({
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
          privateRemoteActiveProfileId: 'profile-1',
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
      }
      if (path === 'voice-inbox-ai/.voice-inbox-ai/private-remote-profiles.json') {
        return JSON.stringify({
          version: 1,
          exportedAt: '2026-06-10T12:00:00.000Z',
          profiles: [
            {
              id: 'profile-1',
              name: 'Ollama',
              baseUrl: 'http://127.0.0.1:11434',
              model: 'qwen2.5:7b-instruct',
            },
          ],
          activeProfileId: 'profile-1',
        });
      }
      return null;
    });

    const result = await restoreGithubSyncVersion({
      secrets: {
        accessToken: 'token',
        owner: 'octocat',
        repo: 'notes',
        branch: 'voice-inbox-ai',
        basePath: 'voice-inbox-ai',
      },
      commitSha: 'abc123',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.auxiliaryData.aiSettings?.transcriptionLanguage).toBe('ru');
    expect(result.auxiliaryData.privateRemoteProfiles?.profiles).toHaveLength(1);
  });

  it('falls back to legacy root manifest', async () => {
    mockGetFileContentAtRef.mockImplementation(async (...args) => {
      const path = args[3];
      return path === 'manifest.json' ? JSON.stringify(manifest) : null;
    });

    const result = await restoreGithubSyncVersion({
      secrets: {
        accessToken: 'token',
        owner: 'octocat',
        repo: 'notes',
        branch: 'voice-inbox-ai',
        basePath: 'voice-inbox-ai',
      },
      commitSha: 'abc123',
    });

    expect(result.ok).toBe(true);
    expect(mockGetFileContentAtRef).toHaveBeenCalledWith(
      'token',
      'octocat',
      'notes',
      'manifest.json',
      'abc123',
    );
  });

  it('returns manifest_not_found when file is missing', async () => {
    mockGetFileContentAtRef.mockResolvedValue(null);

    await expect(
      restoreGithubSyncVersion({
        secrets: {
          accessToken: 'token',
          owner: 'octocat',
          repo: 'notes',
          branch: 'voice-inbox-ai',
          basePath: 'voice-inbox-ai',
        },
        commitSha: 'missing',
      }),
    ).resolves.toEqual({ ok: false, code: 'manifest_not_found' });
  });

  it('returns pro_required when pro is inactive', async () => {
    mockIsProActiveFromStorageSync.mockReturnValueOnce(false);

    await expect(
      restoreGithubSyncVersion({
        secrets: {
          accessToken: 'token',
          owner: 'octocat',
          repo: 'notes',
          branch: 'voice-inbox-ai',
          basePath: 'voice-inbox-ai',
        },
        commitSha: 'abc123',
      }),
    ).resolves.toEqual({ ok: false, code: 'pro_required' });
  });

  it('returns restore_failed when manifest cannot be fetched', async () => {
    mockGetFileContentAtRef.mockRejectedValue(new Error('network down'));

    await expect(
      restoreGithubSyncVersion({
        secrets: {
          accessToken: 'token',
          owner: 'octocat',
          repo: 'notes',
          branch: 'voice-inbox-ai',
          basePath: 'voice-inbox-ai',
        },
        commitSha: 'abc123',
      }),
    ).resolves.toEqual({
      ok: false,
      code: 'restore_failed',
      message: 'network down',
    });
  });

  it('returns invalid_manifest for unsupported payload', async () => {
    mockGetFileContentAtRef.mockResolvedValue(JSON.stringify({ version: 1 }));

    await expect(
      restoreGithubSyncVersion({
        secrets: {
          accessToken: 'token',
          owner: 'octocat',
          repo: 'notes',
          branch: 'voice-inbox-ai',
          basePath: 'voice-inbox-ai',
        },
        commitSha: 'bad',
      }),
    ).resolves.toEqual({ ok: false, code: 'invalid_manifest' });
  });
});
