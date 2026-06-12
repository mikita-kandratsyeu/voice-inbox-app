export {
  toggleRemoteSyncPinnedRepo as toggleGithubSyncPinnedRepo,
  REMOTE_SYNC_MAX_PINNED_REPOS as GITHUB_SYNC_MAX_PINNED_REPOS,
  pruneRemoteSyncPinnedRepos as pruneGithubSyncPinnedRepos,
  type ToggleRemoteSyncPinnedRepoResult as ToggleGithubSyncPinnedRepoResult,
} from '@/features/git-remote-sync/lib/remoteSyncPinnedReposPolicy';
