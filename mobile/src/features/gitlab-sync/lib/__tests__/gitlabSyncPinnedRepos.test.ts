import {
  getGitlabSyncPinnedRepos,
  setGitlabSyncPinnedRepos,
  syncGitlabSyncPinnedRepos,
} from '../gitlabSyncPinnedRepos';

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

describe('gitlabSyncPinnedRepos', () => {
  beforeEach(() => {
    mockStorageState.clear();
  });

  it('stores pinned repos per GitHub login', () => {
    setGitlabSyncPinnedRepos('alice', ['alice/notes', 'org/backup']);
    setGitlabSyncPinnedRepos('bob', ['bob/vault']);

    expect(getGitlabSyncPinnedRepos('alice')).toEqual(['alice/notes', 'org/backup']);
    expect(getGitlabSyncPinnedRepos('bob')).toEqual(['bob/vault']);
  });

  it('prunes unavailable pinned repos for a login', () => {
    setGitlabSyncPinnedRepos('alice', ['alice/notes', 'alice/old']);

    expect(syncGitlabSyncPinnedRepos('alice', ['alice/notes', 'alice/current'])).toEqual([
      'alice/notes',
    ]);
    expect(getGitlabSyncPinnedRepos('alice')).toEqual(['alice/notes']);
  });
});
