jest.mock('@/shared/lib/async-storage', () => ({
  storage: {
    getString: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn(() => false),
  },
}));

import type { Folder } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';

import { buildGitlabSnapshot } from '../buildGitlabSnapshot';
import {
  GITLAB_SYNC_HEAD_FILE,
  GITLAB_SYNC_LEGACY_MANIFEST_FILE,
  GITLAB_SYNC_MANIFEST_FILE,
  GITLAB_SYNC_README_FILE,
} from '../constants';

jest.mock('@/features/sync-data', () => ({
  buildBackupPayload: jest.fn(async () => ({
    version: 4,
    exportedAt: '2026-06-10T12:00:00.000Z',
    folders: [],
    records: [],
    graphLayouts: [{ id: 'layout-1' }],
  })),
}));

jest.mock('@/features/share-record', () => ({
  buildShareText: jest.fn(() => '# Meeting note'),
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

jest.mock('@/shared/lib/device-id', () => ({
  getOrCreateDeviceId: jest.fn(async () => 'device-uuid'),
}));

jest.mock('react-native-nitro-device-info', () => ({
  DeviceInfoModule: { version: '1.2.3' },
}));

jest.mock('react-native-quick-crypto', () => ({
  __esModule: true,
  default: {
    createHash: () => ({
      update: jest.fn().mockReturnThis(),
      digest: () => 'hash-value',
    }),
  },
}));

describe('buildGitlabSnapshot', () => {
  const records: VoiceRecord[] = [
    {
      id: 'rec-1',
      createdAt: '2026-06-01T10:00:00.000Z',
      title: 'Meeting',
    } as VoiceRecord,
  ];
  const folders: Folder[] = [
    {
      id: 'f1',
      name: 'Work',
      color: '#111111',
      icon: 'briefcase',
      sortOrder: 0,
    } as Folder,
  ];

  it('builds note files, manifest, and head metadata', async () => {
    const snapshot = await buildGitlabSnapshot({
      records,
      folders,
      basePath: 'voice-inbox-ai',
    });

    expect(snapshot.recordCount).toBe(1);
    expect(snapshot.folderCount).toBe(1);
    expect(snapshot.graphLayoutCount).toBe(1);
    const notePath = 'voice-inbox-ai/notes/2026/06/2026-06-01-meeting--rec-1.md';
    expect(snapshot.files.get(notePath)).toContain('id: "rec-1"');
    expect(snapshot.files.get(notePath)).toContain('# Meeting note');
    expect(snapshot.files.get(`voice-inbox-ai/${GITLAB_SYNC_MANIFEST_FILE}`)).toContain(
      '"version": 4',
    );
    expect(snapshot.files.get(`voice-inbox-ai/${GITLAB_SYNC_LEGACY_MANIFEST_FILE}`)).toContain(
      '"version": 4',
    );
    expect(snapshot.files.get('voice-inbox-ai/.voice-inbox-ai/index.json')).toContain(
      '"structureVersion": 3',
    );
    expect(snapshot.files.get('voice-inbox-ai/.voice-inbox-ai/ai-settings.json')).toContain(
      '"transcriptionLanguage": "auto"',
    );
    expect(
      snapshot.files.get('voice-inbox-ai/.voice-inbox-ai/private-remote-profiles.json'),
    ).toContain('"profiles": []');
    expect(snapshot.files.get(`voice-inbox-ai/${GITLAB_SYNC_HEAD_FILE}`)).toContain(
      '"formatVersion": 3',
    );
    expect(snapshot.manifest.syncMeta.appVersion).toBe('1.2.3');
    expect(snapshot.manifest.syncMeta.contentHashes).toEqual({
      'rec-1': 'hash-value',
    });
    expect(snapshot.contentHashes[notePath]).toBe('hash-value');
  });

  it('adds a readme when there are no records', async () => {
    const snapshot = await buildGitlabSnapshot({
      records: [],
      folders: [],
      basePath: 'voice-inbox-ai',
    });

    expect(snapshot.files.get(`voice-inbox-ai/${GITLAB_SYNC_README_FILE}`)).toContain(
      'Voice Inbox',
    );
  });
});
