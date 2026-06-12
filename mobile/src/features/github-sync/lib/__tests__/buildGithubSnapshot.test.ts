import type { Folder } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';

import { buildGithubSnapshot } from '../buildGithubSnapshot';
import {
  GITHUB_SYNC_HEAD_FILE,
  GITHUB_SYNC_LEGACY_MANIFEST_FILE,
  GITHUB_SYNC_MANIFEST_FILE,
  GITHUB_SYNC_README_FILE,
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

describe('buildGithubSnapshot', () => {
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
    const snapshot = await buildGithubSnapshot({
      records,
      folders,
      basePath: 'voice-inbox-ai',
    });

    expect(snapshot.recordCount).toBe(1);
    expect(snapshot.folderCount).toBe(1);
    expect(snapshot.graphLayoutCount).toBe(1);
    const notePath = 'voice-inbox-ai/notes/2026/06/2026-06-01-meeting--rec-1.md';
    expect(snapshot.files.get(notePath)).toContain('id: "rec-1"');
    expect(snapshot.files.get(notePath)).toContain(
      'path: "notes/2026/06/2026-06-01-meeting--rec-1.md"',
    );
    expect(snapshot.files.get(notePath)).toContain('# Meeting note');
    expect(snapshot.files.get(`voice-inbox-ai/${GITHUB_SYNC_MANIFEST_FILE}`)).toContain(
      '"version": 4',
    );
    expect(snapshot.files.get(`voice-inbox-ai/${GITHUB_SYNC_LEGACY_MANIFEST_FILE}`)).toContain(
      '"version": 4',
    );
    expect(snapshot.files.get('voice-inbox-ai/.voice-inbox-ai/index.json')).toContain(
      '"structureVersion": 2',
    );
    expect(snapshot.files.get(`voice-inbox-ai/${GITHUB_SYNC_HEAD_FILE}`)).toContain(
      '"formatVersion": 2',
    );
    expect(snapshot.files.get(`voice-inbox-ai/${GITHUB_SYNC_HEAD_FILE}`)).toContain(
      '"manifestPath": ".voice-inbox-ai/manifest.json"',
    );
    expect(snapshot.manifest.syncMeta.appVersion).toBe('1.2.3');
    expect(snapshot.manifest.syncMeta.contentHashes).toEqual({
      'rec-1': 'hash-value',
    });
    expect(snapshot.contentHashes[notePath]).toBe('hash-value');
    expect(snapshot.index.records['rec-1']).toMatchObject({
      id: 'rec-1',
      path: 'notes/2026/06/2026-06-01-meeting--rec-1.md',
      title: 'Meeting',
    });
  });

  it('adds a readme when there are no records', async () => {
    const snapshot = await buildGithubSnapshot({
      records: [],
      folders: [],
      basePath: 'voice-inbox-ai',
    });

    expect(snapshot.files.get(`voice-inbox-ai/${GITHUB_SYNC_README_FILE}`)).toContain(
      'Voice Inbox',
    );
  });
});
