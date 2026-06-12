import {
  type RestoreRemoteSyncResult,
  restoreRemoteSyncVersion,
} from '@/features/git-remote-sync/lib/restoreRemoteSyncVersion';

import { getFileContentAtRef } from './githubApi';
import type { GithubSyncSecrets } from './githubSecrets';

export type RestoreGithubSyncResult = RestoreRemoteSyncResult;

export async function restoreGithubSyncVersion(params: {
  secrets: GithubSyncSecrets;
  commitSha: string;
}): Promise<RestoreGithubSyncResult> {
  const { secrets, commitSha } = params;

  return restoreRemoteSyncVersion({
    basePath: secrets.basePath,
    commitSha,
    fetchManifestAtRef: (manifestPath, ref) =>
      getFileContentAtRef(secrets.accessToken, secrets.owner, secrets.repo, manifestPath, ref),
  });
}
