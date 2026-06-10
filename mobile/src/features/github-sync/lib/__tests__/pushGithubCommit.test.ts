import type { Folder } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';

import { buildGithubSnapshot } from '../buildGithubSnapshot';
import { createGithubCommitWithFiles, getBranchRefSha } from '../githubApi';
import {
  getGithubSyncContentHashes,
  setGithubSyncContentHashes,
  setGithubSyncLastCommitSha,
  setGithubSyncLastError,
  setGithubSyncLastSyncedAt,
} from '../githubSyncState';
import { pushGithubCommit } from '../pushGithubCommit';

jest.mock('@/features/pro-license/lib/proEntitlementStorage', () => ({
  isProActiveFromStorageSync: jest.fn(() => true),
}));

jest.mock('../buildGithubSnapshot', () => ({
  buildGithubSnapshot: jest.fn(),
}));

jest.mock('../githubApi', () => ({
  createGithubCommitWithFiles: jest.fn(),
  getBranchRefSha: jest.fn(),
  listTreePathsAtCommit: jest.fn(),
}));

jest.mock('../githubSyncState', () => ({
  getGithubSyncContentHashes: jest.fn(() => ({})),
  getGithubSyncLastCommitSha: jest.fn(() => 'old-sha'),
  setGithubSyncContentHashes: jest.fn(),
  setGithubSyncLastCommitSha: jest.fn(),
  setGithubSyncLastError: jest.fn(),
  setGithubSyncLastSyncedAt: jest.fn(),
}));

const mockBuildGithubSnapshot = jest.mocked(buildGithubSnapshot);
const mockCreateGithubCommitWithFiles = jest.mocked(createGithubCommitWithFiles);
const mockGetBranchRefSha = jest.mocked(getBranchRefSha);
const mockGetGithubSyncContentHashes = jest.mocked(getGithubSyncContentHashes);

const secrets = {
  accessToken: 'token',
  owner: 'octocat',
  repo: 'notes',
  branch: 'voice-inbox-ai',
  basePath: 'voice-inbox-ai',
};

const records = [{ id: 'rec-1', createdAt: '2026-06-01T10:00:00.000Z' } as VoiceRecord];
const folders = [{ id: 'f1', name: 'Work' } as Folder];

describe('pushGithubCommit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBranchRefSha.mockResolvedValue('parent-sha');
    mockCreateGithubCommitWithFiles.mockResolvedValue('new-sha');
    mockBuildGithubSnapshot.mockResolvedValue({
      files: new Map([['voice-inbox-ai/notes/rec-1.md', '# Note']]),
      contentHashes: {
        'voice-inbox-ai/notes/rec-1.md': 'hash-1',
        'voice-inbox-ai/manifest.json': 'hash-m',
      },
      manifest: {
        version: 4,
        exportedAt: '2026-06-10T12:00:00.000Z',
        folders: [],
        records: [],
        graphLayouts: [],
        syncMeta: {
          appVersion: '1.0.0',
          deviceIdHash: 'device',
          contentHashes: {},
        },
      },
      recordCount: 1,
      folderCount: 1,
      graphLayoutCount: 0,
    });
  });

  it('returns alreadyUpToDate when hashes are unchanged', async () => {
    mockGetGithubSyncContentHashes.mockReturnValue({
      'voice-inbox-ai/notes/rec-1.md': 'hash-1',
      'voice-inbox-ai/manifest.json': 'hash-m',
    });

    await expect(pushGithubCommit({ secrets, records, folders })).resolves.toEqual({
      ok: true,
      commitSha: 'old-sha',
      alreadyUpToDate: true,
    });
    expect(mockCreateGithubCommitWithFiles).not.toHaveBeenCalled();
  });

  it('creates a commit and updates sync state', async () => {
    mockGetGithubSyncContentHashes.mockReturnValue({
      'voice-inbox-ai/notes/rec-1.md': 'old-hash',
    });

    await expect(pushGithubCommit({ secrets, records, folders })).resolves.toEqual({
      ok: true,
      commitSha: 'new-sha',
      alreadyUpToDate: false,
    });

    expect(mockCreateGithubCommitWithFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'token',
        owner: 'octocat',
        repo: 'notes',
        branch: 'voice-inbox-ai',
        basePath: 'voice-inbox-ai',
      }),
    );
    expect(setGithubSyncLastCommitSha).toHaveBeenCalledWith('new-sha');
    expect(setGithubSyncLastSyncedAt).toHaveBeenCalledWith('2026-06-10T12:00:00.000Z');
    expect(setGithubSyncContentHashes).toHaveBeenCalled();
    expect(setGithubSyncLastError).toHaveBeenCalledWith(null);
  });

  it('stores sync errors', async () => {
    mockGetGithubSyncContentHashes.mockReturnValue({});
    mockCreateGithubCommitWithFiles.mockRejectedValue(new Error('rate limited'));

    await expect(pushGithubCommit({ secrets, records, folders })).resolves.toEqual({
      ok: false,
      code: 'sync_failed',
      message: 'rate limited',
    });
    expect(setGithubSyncLastError).toHaveBeenCalledWith('rate limited');
  });
});
