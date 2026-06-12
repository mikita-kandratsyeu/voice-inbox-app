import {
  getRemoteSyncPinnedRepos,
  setRemoteSyncPinnedRepos,
  syncRemoteSyncPinnedRepos,
} from '@/features/git-remote-sync/lib/remoteSyncPinnedRepos';

export function getGitlabSyncPinnedRepos(login: string): string[] {
  return getRemoteSyncPinnedRepos('gitlab', login);
}

export function setGitlabSyncPinnedRepos(login: string, fullNames: readonly string[]): void {
  setRemoteSyncPinnedRepos('gitlab', login, fullNames);
}

export function syncGitlabSyncPinnedRepos(login: string, availableFullNames: readonly string[]): string[] {
  return syncRemoteSyncPinnedRepos('gitlab', login, availableFullNames);
}
