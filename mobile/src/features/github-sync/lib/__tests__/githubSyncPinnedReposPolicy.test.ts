import {
  GITHUB_SYNC_MAX_PINNED_REPOS,
  pruneGithubSyncPinnedRepos,
  toggleGithubSyncPinnedRepo,
} from '../githubSyncPinnedReposPolicy';

describe('githubSyncPinnedReposPolicy', () => {
  it('adds and removes pinned repos', () => {
    expect(toggleGithubSyncPinnedRepo([], 'user/a')).toEqual({
      ok: true,
      pinned: ['user/a'],
    });
    expect(toggleGithubSyncPinnedRepo(['user/a'], 'user/a')).toEqual({
      ok: true,
      pinned: [],
    });
  });

  it('rejects pinning more than the max', () => {
    const current = Array.from(
      { length: GITHUB_SYNC_MAX_PINNED_REPOS },
      (_, i) => `user/repo-${i}`,
    );
    expect(toggleGithubSyncPinnedRepo(current, 'user/new')).toEqual({
      ok: false,
      reason: 'max',
    });
  });

  it('prunes pinned repos that are no longer available', () => {
    expect(pruneGithubSyncPinnedRepos(['a/r1', 'a/r2'], ['a/r2', 'a/r3'])).toEqual(['a/r2']);
  });
});
