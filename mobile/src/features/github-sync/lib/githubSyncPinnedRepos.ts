import {
  getRemoteSyncPinnedRepos,
  setRemoteSyncPinnedRepos,
  syncRemoteSyncPinnedRepos,
} from '@/features/git-remote-sync/lib/remoteSyncPinnedRepos';

export function getGithubSyncPinnedRepos(login: string): string[] {
  return getRemoteSyncPinnedRepos('github', login);
}

export function setGithubSyncPinnedRepos(login: string, fullNames: readonly string[]): void {
  setRemoteSyncPinnedRepos('github', login, fullNames);
}

export function syncGithubSyncPinnedRepos(
  login: string,
  availableFullNames: readonly string[],
): string[] {
  return syncRemoteSyncPinnedRepos('github', login, availableFullNames);
}
