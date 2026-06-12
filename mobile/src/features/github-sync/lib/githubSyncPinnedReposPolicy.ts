export {
  REMOTE_SYNC_MAX_PINNED_REPOS as GITHUB_SYNC_MAX_PINNED_REPOS,
  pruneRemoteSyncPinnedRepos as pruneGithubSyncPinnedRepos,
  toggleRemoteSyncPinnedRepo as toggleGithubSyncPinnedRepo,
  type ToggleRemoteSyncPinnedRepoResult as ToggleGithubSyncPinnedRepoResult,
} from '@/features/git-remote-sync/lib/remoteSyncPinnedReposPolicy';
