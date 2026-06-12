import type { Folder } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';
import { loadRecordsForRemoteSync } from '@/features/git-remote-sync/lib/loadRecordsForRemoteSync';
import {
  pushRemoteCommit,
  type PushRemoteCommitResult,
  type RemoteSyncPushAdapter,
} from '@/features/git-remote-sync/lib/pushRemoteCommit';
import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';

import { buildGithubSnapshot } from './buildGithubSnapshot';
import { areGithubSyncHashesEqual } from './computeGithubSyncDiff';
import { formatGithubCommitMessage } from './formatGithubCommitMessage';
import {
  createGithubCommitWithFiles,
  fetchGithubUserLogin,
  getBranchRefSha,
  isGithubApiError,
  listTreePathsAtCommit,
} from './githubApi';
import type { GithubSyncSecrets } from './githubSecrets';
import { updateGithubSyncProgress } from './githubSyncProgress';
import {
  getGithubSyncContentHashes,
  getGithubSyncLastCommitSha,
  setGithubSyncContentHashes,
  setGithubSyncLastCommitSha,
  setGithubSyncLastError,
  setGithubSyncLastSyncedAt,
} from './githubSyncState';
import {
  GITHUB_SYNC_TIMEOUT_ERROR,
  isGithubSyncTimeoutError,
  withGithubSyncTimeout,
} from './githubSyncTimeout';

export type PushGithubCommitResult = PushRemoteCommitResult;

function createGithubPushAdapter(
  secrets: GithubSyncSecrets,
  reportProgress: boolean,
): RemoteSyncPushAdapter {
  const { accessToken, owner, repo, branch, basePath } = secrets;

  return {
    accessToken,
    branch,
    basePath,
    trackExistingPathsWhenDeleting: false,
    verifyAuth: async () => {
      await fetchGithubUserLogin(accessToken);
    },
    getBranchRefSha: () => getBranchRefSha(accessToken, owner, repo, branch),
    listTreePathsAtCommit: (parentSha) =>
      listTreePathsAtCommit(accessToken, owner, repo, parentSha, basePath),
    createCommitWithFiles: (input) =>
      createGithubCommitWithFiles({
        accessToken,
        owner,
        repo,
        branch,
        basePath,
        files: input.files,
        deletions: input.deletions,
        message: input.message,
        onUploadProgress: input.onUploadProgress,
        onCommitting: input.onCommitting,
      }),
    isRefConflictError: (err) => isGithubApiError(err) && err.code === 'ref_conflict',
    buildSnapshot: (records, folders) => buildGithubSnapshot({ records, folders, basePath }),
    getPreviousHashes: getGithubSyncContentHashes,
    areHashesEqual: areGithubSyncHashesEqual,
    getLastCommitSha: getGithubSyncLastCommitSha,
    setLastCommitSha: setGithubSyncLastCommitSha,
    setLastSyncedAt: setGithubSyncLastSyncedAt,
    setContentHashes: setGithubSyncContentHashes,
    setLastError: setGithubSyncLastError,
    formatCommitMessage: formatGithubCommitMessage,
    reportStage: reportProgress
      ? (stage) => {
          updateGithubSyncProgress({ stage });
        }
      : undefined,
    reportUploadProgress: reportProgress
      ? (uploadCurrent, uploadTotal) => {
          updateGithubSyncProgress({ stage: 'uploading', uploadCurrent, uploadTotal });
        }
      : undefined,
  };
}

export async function pushGithubCommit(params: {
  secrets: GithubSyncSecrets;
  records?: VoiceRecord[];
  folders: Folder[];
  reportProgress?: boolean;
}): Promise<PushGithubCommitResult> {
  const { secrets, folders, reportProgress = false } = params;
  const records = params.records ?? (await loadRecordsForRemoteSync());

  return pushRemoteCommit({
    records,
    folders,
    reportProgress,
    adapter: createGithubPushAdapter(secrets, reportProgress),
    isProActive: isProActiveFromStorageSync,
    withTimeout: withGithubSyncTimeout,
    isTimeoutError: isGithubSyncTimeoutError,
    timeoutErrorMessage: GITHUB_SYNC_TIMEOUT_ERROR,
  });
}
