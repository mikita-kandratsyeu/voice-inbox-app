import type { Folder } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';
import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';

import { buildGitlabSnapshot } from '../buildGitlabSnapshot';
import {
  createGitlabCommitWithFiles,
  fetchGitlabUserLogin,
  getBranchRefSha,
  listTreePathsAtCommit,
} from '../gitlabApi';
import {
  getGitlabSyncContentHashes,
  setGitlabSyncContentHashes,
  setGitlabSyncLastCommitSha,
  setGitlabSyncLastError,
  setGitlabSyncLastSyncedAt,
} from '../gitlabSyncState';
import { pushGitlabCommit } from '../pushGitlabCommit';

jest.mock('@/features/pro-license/lib/proEntitlementStorage', () => ({
  isProActiveFromStorageSync: jest.fn(() => true),
}));

jest.mock('../buildGitlabSnapshot', () => ({
  buildGitlabSnapshot: jest.fn(),
}));

jest.mock('../gitlabApi', () => ({
  createGitlabCommitWithFiles: jest.fn(),
  fetchGitlabUserLogin: jest.fn(),
  getBranchRefSha: jest.fn(),
  listTreePathsAtCommit: jest.fn(),
  isGitlabApiError: (err: unknown): err is Error & { code?: string } =>
    err instanceof Error && 'code' in err,
}));

jest.mock('../gitlabSyncState', () => ({
  getGitlabSyncContentHashes: jest.fn(() => ({})),
  getGitlabSyncLastCommitSha: jest.fn(() => 'old-sha'),
  setGitlabSyncContentHashes: jest.fn(),
  setGitlabSyncLastCommitSha: jest.fn(),
  setGitlabSyncLastError: jest.fn(),
  setGitlabSyncLastSyncedAt: jest.fn(),
}));

const mockIsProActiveFromStorageSync = jest.mocked(isProActiveFromStorageSync);
const mockBuildGitlabSnapshot = jest.mocked(buildGitlabSnapshot);
const mockCreateGitlabCommitWithFiles = jest.mocked(createGitlabCommitWithFiles);
const mockFetchGitlabUserLogin = jest.mocked(fetchGitlabUserLogin);
const mockGetBranchRefSha = jest.mocked(getBranchRefSha);
const mockListTreePathsAtCommit = jest.mocked(listTreePathsAtCommit);
const mockGetGitlabSyncContentHashes = jest.mocked(getGitlabSyncContentHashes);

const secrets = {
  accessToken: 'token',
  owner: 'acme',
  repo: 'voice-inbox-ai',
  projectId: 42,
  branch: 'voice-inbox-ai-sync',
  basePath: 'voice-inbox-ai',
};

const records = [{ id: 'rec-1', createdAt: '2026-06-01T10:00:00.000Z' } as VoiceRecord];
const folders = [{ id: 'f1', name: 'Work' } as Folder];

describe('pushGitlabCommit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchGitlabUserLogin.mockResolvedValue('gitlab-user');
    mockGetBranchRefSha.mockResolvedValue('parent-sha');
    mockCreateGitlabCommitWithFiles.mockResolvedValue('new-sha');
    mockListTreePathsAtCommit.mockResolvedValue([]);
    mockBuildGitlabSnapshot.mockResolvedValue({
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
      index: {
        structureVersion: 2,
        exportedAt: '2026-06-10T12:00:00.000Z',
        notesPath: 'notes',
        records: {
          'rec-1': {
            id: 'rec-1',
            path: 'notes/rec-1.md',
            hash: 'hash-1',
            title: 'Note',
            createdAt: '2026-06-01T10:00:00.000Z',
          },
        },
      },
      recordCount: 1,
      folderCount: 1,
      graphLayoutCount: 0,
    });
  });

  it('returns pro_required when pro is inactive', async () => {
    mockIsProActiveFromStorageSync.mockReturnValueOnce(false);

    await expect(pushGitlabCommit({ secrets, records, folders })).resolves.toEqual({
      ok: false,
      code: 'pro_required',
    });
  });

  it('returns already up to date when content hashes match', async () => {
    mockGetGitlabSyncContentHashes.mockReturnValueOnce({
      'voice-inbox-ai/notes/rec-1.md': 'hash-1',
      'voice-inbox-ai/manifest.json': 'hash-m',
    });

    await expect(pushGitlabCommit({ secrets, records, folders })).resolves.toEqual({
      ok: true,
      commitSha: 'old-sha',
      alreadyUpToDate: true,
    });
    expect(mockCreateGitlabCommitWithFiles).not.toHaveBeenCalled();
  });

  it('pushes a commit and updates sync state', async () => {
    await expect(pushGitlabCommit({ secrets, records, folders })).resolves.toEqual({
      ok: true,
      commitSha: 'new-sha',
      alreadyUpToDate: false,
    });

    expect(mockCreateGitlabCommitWithFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'token',
        projectId: 42,
        branch: 'voice-inbox-ai-sync',
      }),
    );
    expect(setGitlabSyncLastCommitSha).toHaveBeenCalledWith('new-sha');
    expect(setGitlabSyncContentHashes).toHaveBeenCalled();
    expect(setGitlabSyncLastSyncedAt).toHaveBeenCalled();
    expect(setGitlabSyncLastError).toHaveBeenCalledWith(null);
  });
});
