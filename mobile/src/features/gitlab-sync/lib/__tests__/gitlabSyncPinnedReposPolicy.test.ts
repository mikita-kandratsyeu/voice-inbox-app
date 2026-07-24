import {
  GITLAB_SYNC_MAX_PINNED_REPOS,
  pruneGitlabSyncPinnedRepos,
  toggleGitlabSyncPinnedRepo,
} from '../gitlabSyncPinnedReposPolicy';

describe('gitlabSyncPinnedReposPolicy', () => {
  it('adds and removes pinned repos', () => {
    expect(toggleGitlabSyncPinnedRepo([], 'user/a')).toEqual({
      ok: true,
      pinned: ['user/a'],
    });
    expect(toggleGitlabSyncPinnedRepo(['user/a'], 'user/a')).toEqual({
      ok: true,
      pinned: [],
    });
  });

  it('rejects pinning more than the max', () => {
    const current = Array.from(
      { length: GITLAB_SYNC_MAX_PINNED_REPOS },
      (_, i) => `user/repo-${i}`,
    );
    expect(toggleGitlabSyncPinnedRepo(current, 'user/new')).toEqual({
      ok: false,
      reason: 'max',
    });
  });

  it('prunes pinned repos that are no longer available', () => {
    expect(pruneGitlabSyncPinnedRepos(['a/r1', 'a/r2'], ['a/r2', 'a/r3'])).toEqual(['a/r2']);
  });
});
