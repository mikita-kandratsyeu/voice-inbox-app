export {
  toggleRemoteSyncPinnedRepo as toggleGitlabSyncPinnedRepo,
  REMOTE_SYNC_MAX_PINNED_REPOS as GITLAB_SYNC_MAX_PINNED_REPOS,
  pruneRemoteSyncPinnedRepos as pruneGitlabSyncPinnedRepos,
  type ToggleRemoteSyncPinnedRepoResult as ToggleGitlabSyncPinnedRepoResult,
} from '@/features/git-remote-sync/lib/remoteSyncPinnedReposPolicy';
