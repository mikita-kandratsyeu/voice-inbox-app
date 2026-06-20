import {
  type RestoreRemoteSyncResult,
  restoreRemoteSyncVersion,
} from '@/features/git-remote-sync/lib/restoreRemoteSyncVersion';

import { ICLOUD_SYNC_DEFAULT_BASE_PATH } from './constants';
import { readIcloudSyncFileAtVersion } from './pushIcloudSnapshot';

export type RestoreIcloudSyncResult = RestoreRemoteSyncResult;

export async function restoreIcloudSyncVersion(params: {
  basePath?: string;
  versionId: string;
}): Promise<RestoreIcloudSyncResult> {
  const basePath = params.basePath ?? ICLOUD_SYNC_DEFAULT_BASE_PATH;
  const { versionId } = params;

  return restoreRemoteSyncVersion({
    basePath,
    commitSha: versionId,
    fetchManifestAtRef: (manifestPath, ref) => {
      void manifestPath;
      return readIcloudSyncFileAtVersion({
        basePath,
        versionId: ref,
        relativePath: 'manifest.json',
      });
    },
    fetchFileAtRef: (filePath, ref) => {
      if (filePath.includes('ai-settings.json')) {
        return readIcloudSyncFileAtVersion({
          basePath,
          versionId: ref,
          relativePath: 'ai-settings.json',
        });
      }
      if (filePath.includes('private-remote-profiles.json')) {
        return readIcloudSyncFileAtVersion({
          basePath,
          versionId: ref,
          relativePath: 'private-remote-profiles.json',
        });
      }
      return Promise.resolve(null);
    },
  });
}
