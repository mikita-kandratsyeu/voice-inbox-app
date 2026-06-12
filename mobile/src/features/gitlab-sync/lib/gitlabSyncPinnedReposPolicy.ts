export {
  REMOTE_SYNC_MAX_PINNED_REPOS as GITLAB_SYNC_MAX_PINNED_REPOS,
  pruneRemoteSyncPinnedRepos as pruneGitlabSyncPinnedRepos,
  toggleRemoteSyncPinnedRepo as toggleGitlabSyncPinnedRepo,
  type ToggleRemoteSyncPinnedRepoResult as ToggleGitlabSyncPinnedRepoResult,
} from '@/features/git-remote-sync/lib/remoteSyncPinnedReposPolicy';
