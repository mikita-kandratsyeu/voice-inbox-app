export {
  areRemoteSyncHashesEqual as areGitlabSyncHashesEqual,
  computeRemoteSyncDiff as computeGitlabSyncDiff,
  type RemoteSyncDiff as GitlabSyncDiff,
} from '@/features/git-remote-sync/lib/computeRemoteSyncDiff';
