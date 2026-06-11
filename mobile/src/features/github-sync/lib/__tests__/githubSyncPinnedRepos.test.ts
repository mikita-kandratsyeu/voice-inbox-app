import {
  getGithubSyncPinnedRepos,
  setGithubSyncPinnedRepos,
  syncGithubSyncPinnedRepos,
} from '../githubSyncPinnedRepos';

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

describe('githubSyncPinnedRepos', () => {
  beforeEach(() => {
    mockStorageState.clear();
  });

  it('stores pinned repos per GitHub login', () => {
    setGithubSyncPinnedRepos('alice', ['alice/notes', 'org/backup']);
    setGithubSyncPinnedRepos('bob', ['bob/vault']);

    expect(getGithubSyncPinnedRepos('alice')).toEqual(['alice/notes', 'org/backup']);
    expect(getGithubSyncPinnedRepos('bob')).toEqual(['bob/vault']);
  });

  it('prunes unavailable pinned repos for a login', () => {
    setGithubSyncPinnedRepos('alice', ['alice/notes', 'alice/old']);

    expect(syncGithubSyncPinnedRepos('alice', ['alice/notes', 'alice/current'])).toEqual([
      'alice/notes',
    ]);
    expect(getGithubSyncPinnedRepos('alice')).toEqual(['alice/notes']);
  });
});
