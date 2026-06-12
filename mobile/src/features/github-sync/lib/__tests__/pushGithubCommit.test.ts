import type { Folder } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';
import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';

import { buildGithubSnapshot } from '../buildGithubSnapshot';
import { GITHUB_SYNC_TIMEOUT_MS } from '../constants';
import {
  createGithubCommitWithFiles,
  fetchGithubUserLogin,
  getBranchRefSha,
  listTreePathsAtCommit,
} from '../githubApi';
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
  fetchGithubUserLogin: jest.fn(),
  getBranchRefSha: jest.fn(),
  listTreePathsAtCommit: jest.fn(),
  isGithubApiError: (err: unknown): err is Error & { code?: string } =>
    err instanceof Error && 'code' in err,
}));

jest.mock('../githubSyncState', () => ({
  getGithubSyncContentHashes: jest.fn(() => ({})),
  getGithubSyncLastCommitSha: jest.fn(() => 'old-sha'),
  setGithubSyncContentHashes: jest.fn(),
  setGithubSyncLastCommitSha: jest.fn(),
  setGithubSyncLastError: jest.fn(),
  setGithubSyncLastSyncedAt: jest.fn(),
}));

const mockIsProActiveFromStorageSync = jest.mocked(isProActiveFromStorageSync);
const mockBuildGithubSnapshot = jest.mocked(buildGithubSnapshot);
const mockCreateGithubCommitWithFiles = jest.mocked(createGithubCommitWithFiles);
const mockFetchGithubUserLogin = jest.mocked(fetchGithubUserLogin);
const mockGetBranchRefSha = jest.mocked(getBranchRefSha);
const mockListTreePathsAtCommit = jest.mocked(listTreePathsAtCommit);
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
    mockFetchGithubUserLogin.mockResolvedValue('octocat');
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

    await expect(pushGithubCommit({ secrets, records, folders })).resolves.toEqual({
      ok: false,
      code: 'pro_required',
    });
    expect(mockFetchGithubUserLogin).not.toHaveBeenCalled();
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

  it('propagates non-401 auth failures as sync_failed', async () => {
    const err = Object.assign(new Error('GitHub user failed: 503'), { status: 503 });
    mockFetchGithubUserLogin.mockRejectedValue(err);

    await expect(pushGithubCommit({ secrets, records, folders })).resolves.toEqual({
      ok: false,
      code: 'sync_failed',
      message: 'GitHub user failed: 503',
    });
  });

  it('detects deleted note files from the remote tree', async () => {
    mockGetGithubSyncContentHashes.mockReturnValue({
      'voice-inbox-ai/notes/rec-1.md': 'old-hash',
    });
    mockListTreePathsAtCommit.mockResolvedValue([
      'voice-inbox-ai/notes/rec-1.md',
      'voice-inbox-ai/notes/rec-old.md',
    ]);

    await pushGithubCommit({ secrets, records, folders });

    expect(mockCreateGithubCommitWithFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        deletions: ['voice-inbox-ai/notes/rec-old.md'],
      }),
    );
  });

  it('returns unauthorized when token validation fails with 401', async () => {
    const err = Object.assign(new Error('GitHub user failed: 401'), { status: 401 });
    mockFetchGithubUserLogin.mockRejectedValue(err);

    await expect(pushGithubCommit({ secrets, records, folders })).resolves.toEqual({
      ok: false,
      code: 'unauthorized',
    });
    expect(mockCreateGithubCommitWithFiles).not.toHaveBeenCalled();
  });

  it('returns ref_conflict when the branch tip moved on GitHub', async () => {
    mockGetGithubSyncContentHashes.mockReturnValue({});
    const err = Object.assign(new Error('Ref conflict'), { status: 422, code: 'ref_conflict' });
    mockCreateGithubCommitWithFiles.mockRejectedValue(err);

    await expect(pushGithubCommit({ secrets, records, folders })).resolves.toEqual({
      ok: false,
      code: 'ref_conflict',
    });
  });

  it('returns unauthorized when blob upload fails with 401', async () => {
    mockGetGithubSyncContentHashes.mockReturnValue({});
    const err = Object.assign(new Error('Create blob failed: 401'), { status: 401 });
    mockCreateGithubCommitWithFiles.mockRejectedValue(err);

    await expect(pushGithubCommit({ secrets, records, folders })).resolves.toEqual({
      ok: false,
      code: 'unauthorized',
      message: 'Create blob failed: 401',
    });
  });

  it('returns sync_timeout when the operation exceeds the budget', async () => {
    jest.useFakeTimers();
    mockGetGithubSyncContentHashes.mockReturnValue({});
    mockCreateGithubCommitWithFiles.mockImplementation(() => new Promise(() => {}));

    const resultPromise = pushGithubCommit({ secrets, records, folders });
    await jest.advanceTimersByTimeAsync(GITHUB_SYNC_TIMEOUT_MS + 1);

    await expect(resultPromise).resolves.toEqual({
      ok: false,
      code: 'sync_timeout',
    });
    expect(setGithubSyncLastError).toHaveBeenCalledWith('github_sync_timeout');

    jest.useRealTimers();
  });
});
