jest.mock('@/shared/lib/folderColor', () => ({
  DEFAULT_FOLDER_BRAND_HEX: '#3b82f6',
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
    expect(mockGetFileContentAtRef).toHaveBeenNthCalledWith(
      1,
      'token',
      'octocat',
      'notes',
      'voice-inbox-ai/manifest.json',
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
