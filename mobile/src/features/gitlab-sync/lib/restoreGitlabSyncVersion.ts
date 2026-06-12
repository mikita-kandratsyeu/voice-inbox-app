import {
  type RestoreRemoteSyncResult,
  restoreRemoteSyncVersion,
} from '@/features/git-remote-sync/lib/restoreRemoteSyncVersion';

import { getFileContentAtRef } from './gitlabApi';
import type { GitlabSyncSecrets } from './gitlabSecrets';

export type RestoreGitlabSyncResult = RestoreRemoteSyncResult;

export async function restoreGitlabSyncVersion(params: {
  secrets: GitlabSyncSecrets;
  commitSha: string;
}): Promise<RestoreGitlabSyncResult> {
  const { secrets, commitSha } = params;

  return restoreRemoteSyncVersion({
    basePath: secrets.basePath,
    commitSha,
    fetchManifestAtRef: (manifestPath, ref) =>
      getFileContentAtRef(secrets.accessToken, secrets.projectId, manifestPath, ref),
  });
}
