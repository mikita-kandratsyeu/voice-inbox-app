import {
  clearGitlabSyncState,
  getGitlabSyncContentHashes,
  getGitlabSyncLastCommitSha,
  getGitlabSyncLastError,
  getGitlabSyncLastSyncedAt,
  setGitlabSyncContentHashes,
  setGitlabSyncLastCommitSha,
  setGitlabSyncLastError,
  setGitlabSyncLastSyncedAt,
} from '../gitlabSyncState';

const mockStorageState = new Map<string, string>();

jest.mock('@/shared/lib/async-storage/mmkv', () => ({
  storage: {
    getString: (key: string) => mockStorageState.get(key),
    set: (key: string, value: string) => {
      mockStorageState.set(key, value);
    },
    remove: (key: string) => {
      mockStorageState.delete(key);
    },
  },
}));

describe('gitlabSyncState', () => {
  beforeEach(() => {
    mockStorageState.clear();
  });

  it('stores and reads commit metadata', () => {
    setGitlabSyncLastCommitSha('abc123');
    setGitlabSyncLastSyncedAt('2026-06-10T12:00:00.000Z');

    expect(getGitlabSyncLastCommitSha()).toBe('abc123');
    expect(getGitlabSyncLastSyncedAt()).toBe('2026-06-10T12:00:00.000Z');
  });

  it('stores and clears last error', () => {
    setGitlabSyncLastError('network failed');
    expect(getGitlabSyncLastError()).toBe('network failed');

    setGitlabSyncLastError(null);
    expect(getGitlabSyncLastError()).toBeNull();
  });

  it('persists content hashes as json', () => {
    setGitlabSyncContentHashes({
      'voice-inbox-ai/notes/a.md': 'hash-a',
    });

    expect(getGitlabSyncContentHashes()).toEqual({
      'voice-inbox-ai/notes/a.md': 'hash-a',
    });
  });

  it('returns empty hashes for invalid json', () => {
    mockStorageState.set('gitlabSync.contentHashes', '{not-json');

    expect(getGitlabSyncContentHashes()).toEqual({});
  });

  it('clears all sync state keys', () => {
    setGitlabSyncLastCommitSha('sha');
    setGitlabSyncLastSyncedAt('2026-06-10T12:00:00.000Z');
    setGitlabSyncLastError('oops');
    setGitlabSyncContentHashes({ 'voice-inbox-ai/manifest.json': 'm1' });

    clearGitlabSyncState();

    expect(getGitlabSyncLastCommitSha()).toBeNull();
    expect(getGitlabSyncLastSyncedAt()).toBeNull();
    expect(getGitlabSyncLastError()).toBeNull();
    expect(getGitlabSyncContentHashes()).toEqual({});
  });
});
