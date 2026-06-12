import type { Folder } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';
import {
  pushRemoteCommit,
  type PushRemoteCommitResult,
  type RemoteSyncPushAdapter,
} from '@/features/git-remote-sync/lib/pushRemoteCommit';
import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';

import { buildGitlabSnapshot } from './buildGitlabSnapshot';
import { areGitlabSyncHashesEqual } from './computeGitlabSyncDiff';
import { formatGitlabCommitMessage } from './formatGitlabCommitMessage';
import {
  createGitlabCommitWithFiles,
  fetchGitlabUserLogin,
  getBranchRefSha,
  isGitlabApiError,
  listTreePathsAtCommit,
} from './gitlabApi';
import type { GitlabSyncSecrets } from './gitlabSecrets';
import { updateGitlabSyncProgress } from './gitlabSyncProgress';
import {
  getGitlabSyncContentHashes,
  getGitlabSyncLastCommitSha,
  setGitlabSyncContentHashes,
  setGitlabSyncLastCommitSha,
  setGitlabSyncLastError,
  setGitlabSyncLastSyncedAt,
} from './gitlabSyncState';
import {
  GITLAB_SYNC_TIMEOUT_ERROR,
  isGitlabSyncTimeoutError,
  withGitlabSyncTimeout,
} from './gitlabSyncTimeout';

export type PushGitlabCommitResult = PushRemoteCommitResult;

function createGitlabPushAdapter(
  secrets: GitlabSyncSecrets,
  reportProgress: boolean,
): RemoteSyncPushAdapter {
  const { accessToken, projectId, branch, basePath } = secrets;

  return {
    accessToken,
    branch,
    basePath,
    trackExistingPathsWhenDeleting: true,
    verifyAuth: async () => {
      await fetchGitlabUserLogin(accessToken);
    },
    getBranchRefSha: () => getBranchRefSha(accessToken, projectId, branch),
    listTreePathsAtCommit: (parentSha) =>
      listTreePathsAtCommit(accessToken, projectId, parentSha, basePath),
    createCommitWithFiles: (input) =>
      createGitlabCommitWithFiles({
        accessToken,
        projectId,
        branch,
        basePath,
        files: input.files,
        deletions: input.deletions,
        existingRelativePaths: input.existingRelativePaths,
        message: input.message,
        onUploadProgress: input.onUploadProgress,
        onCommitting: input.onCommitting,
      }),
    isRefConflictError: (err) => isGitlabApiError(err) && err.code === 'ref_conflict',
    buildSnapshot: (records, folders) => buildGitlabSnapshot({ records, folders, basePath }),
    getPreviousHashes: getGitlabSyncContentHashes,
    areHashesEqual: areGitlabSyncHashesEqual,
    getLastCommitSha: getGitlabSyncLastCommitSha,
    setLastCommitSha: setGitlabSyncLastCommitSha,
    setLastSyncedAt: setGitlabSyncLastSyncedAt,
    setContentHashes: setGitlabSyncContentHashes,
    setLastError: setGitlabSyncLastError,
    formatCommitMessage: formatGitlabCommitMessage,
    reportStage: reportProgress
      ? (stage) => {
          updateGitlabSyncProgress({ stage });
        }
      : undefined,
    reportUploadProgress: reportProgress
      ? (uploadCurrent, uploadTotal) => {
          updateGitlabSyncProgress({ stage: 'uploading', uploadCurrent, uploadTotal });
        }
      : undefined,
  };
}

export async function pushGitlabCommit(params: {
  secrets: GitlabSyncSecrets;
  records: VoiceRecord[];
  folders: Folder[];
  reportProgress?: boolean;
}): Promise<PushGitlabCommitResult> {
  const { secrets, records, folders, reportProgress = false } = params;

  return pushRemoteCommit({
    records,
    folders,
    reportProgress,
    adapter: createGitlabPushAdapter(secrets, reportProgress),
    isProActive: isProActiveFromStorageSync,
    withTimeout: withGitlabSyncTimeout,
    isTimeoutError: isGitlabSyncTimeoutError,
    timeoutErrorMessage: GITLAB_SYNC_TIMEOUT_ERROR,
  });
}
