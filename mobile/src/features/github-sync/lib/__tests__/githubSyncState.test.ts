import {
  clearGithubSyncState,
  getGithubSyncContentHashes,
  getGithubSyncLastCommitSha,
  getGithubSyncLastError,
  getGithubSyncLastSyncedAt,
  setGithubSyncContentHashes,
  setGithubSyncLastCommitSha,
  setGithubSyncLastError,
  setGithubSyncLastSyncedAt,
} from '../githubSyncState';

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

describe('githubSyncState', () => {
  beforeEach(() => {
    mockStorageState.clear();
  });

  it('stores and reads commit metadata', () => {
    setGithubSyncLastCommitSha('abc123');
    setGithubSyncLastSyncedAt('2026-06-10T12:00:00.000Z');

    expect(getGithubSyncLastCommitSha()).toBe('abc123');
    expect(getGithubSyncLastSyncedAt()).toBe('2026-06-10T12:00:00.000Z');
  });

  it('stores and clears last error', () => {
    setGithubSyncLastError('network failed');
    expect(getGithubSyncLastError()).toBe('network failed');

    setGithubSyncLastError(null);
    expect(getGithubSyncLastError()).toBeNull();
  });

  it('persists content hashes as json', () => {
    setGithubSyncContentHashes({
      'voice-inbox-ai/notes/a.md': 'hash-a',
    });

    expect(getGithubSyncContentHashes()).toEqual({
      'voice-inbox-ai/notes/a.md': 'hash-a',
    });
  });

  it('returns empty hashes for invalid json', () => {
    mockStorageState.set('githubSync.contentHashes', '{not-json');

    expect(getGithubSyncContentHashes()).toEqual({});
  });

  it('clears all sync state keys', () => {
    setGithubSyncLastCommitSha('sha');
    setGithubSyncLastSyncedAt('2026-06-10T12:00:00.000Z');
    setGithubSyncLastError('oops');
    setGithubSyncContentHashes({ 'voice-inbox-ai/manifest.json': 'm1' });

    clearGithubSyncState();

    expect(getGithubSyncLastCommitSha()).toBeNull();
    expect(getGithubSyncLastSyncedAt()).toBeNull();
    expect(getGithubSyncLastError()).toBeNull();
    expect(getGithubSyncContentHashes()).toEqual({});
  });
});
