export {
  areRemoteSyncHashesEqual as areGithubSyncHashesEqual,
  computeRemoteSyncDiff as computeGithubSyncDiff,
  type RemoteSyncDiff as GithubSyncDiff,
} from '@/features/git-remote-sync/lib/computeRemoteSyncDiff';
