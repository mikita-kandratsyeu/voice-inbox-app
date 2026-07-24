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

import { buildIcloudSnapshot } from '../buildIcloudSnapshot';

jest.mock('@/features/sync-data', () => ({
  buildBackupPayload: jest.fn(
    async (records: VoiceRecord[], folders: Folder[], options?: { includeAudio?: boolean }) => ({
      version: 4,
      exportedAt: '2026-06-10T12:00:00.000Z',
      folders,
      records: records.map((record) => {
        if (options?.includeAudio && record.audioPath) {
          return { ...record, audioPath: `audio/${record.id}.m4a` };
        }
        const { audioPath: _audioPath, ...withoutAudio } = record;
        return withoutAudio;
      }),
      graphLayouts: [],
    }),
  ),
}));

jest.mock('@/features/sync-data/lib/buildBackupPayload', () => ({
  prepareBackupExportDirectory: jest.fn(async () => {}),
}));

jest.mock('@/features/share-record', () => ({
  buildShareText: jest.fn(() => '# Note body'),
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

jest.mock('@/shared/lib/fs', () => ({
  getCachesDirectoryPath: jest.fn(() => '/tmp/cache'),
  NitroFS: {
    exists: jest.fn(async () => true),
    readFile: jest.fn(async () => 'YmFzZTY0'),
  },
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

describe('buildIcloudSnapshot', () => {
  it('includes audio files in the snapshot payload and binary upload map', async () => {
    const snapshot = await buildIcloudSnapshot({
      basePath: 'voice-inbox-ai',
      folders: [],
      records: [
        {
          id: 'rec-audio',
          createdAt: '2026-06-01T10:00:00.000Z',
          title: 'Voice memo',
          audioPath: '/docs/recordings/rec-audio.m4a',
        } as VoiceRecord,
      ],
    });

    expect(snapshot.files.get('voice-inbox-ai/.voice-inbox-ai/records.json')).toContain(
      '"audio/rec-audio.m4a"',
    );
    expect(snapshot.localBinaryFiles?.get('voice-inbox-ai/audio/rec-audio.m4a')).toContain(
      '/tmp/cache/remote-sync-export-',
    );
    expect(snapshot.contentHashes['voice-inbox-ai/audio/rec-audio.m4a']).toBe('hash-value');
    expect(snapshot.tempCleanupDirs?.length).toBe(1);
  });
});
