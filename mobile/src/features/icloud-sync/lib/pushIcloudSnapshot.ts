import type { Folder } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';
import { loadRecordsForRemoteSync } from '@/features/git-remote-sync/lib/loadRecordsForRemoteSync';
import {
  type FileSyncPushAdapter,
  pushFileSnapshot,
  type PushFileSnapshotResult,
} from '@/features/git-remote-sync/lib/pushFileSnapshot';
import { joinRepoPath } from '@/features/git-remote-sync/lib/repoPaths';
import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';

import { buildIcloudSnapshot } from './buildIcloudSnapshot';
import { areIcloudSyncHashesEqual } from './computeIcloudSyncDiff';
import {
  ICLOUD_SYNC_DEFAULT_BASE_PATH,
  ICLOUD_SYNC_MAX_VERSIONS,
  ICLOUD_SYNC_VERSIONS_DIR,
} from './constants';
import { formatIcloudVersionLabel } from './formatIcloudVersionLabel';
import {
  deleteIcloudDirectoryRecursive,
  deleteIcloudRelativePaths,
  ensureIcloudDirectory,
  listIcloudRelativePaths,
  readIcloudRelativeFile,
  writeIcloudRelativeFile,
  writeIcloudRelativeFiles,
} from './icloudNative';
import { updateIcloudSyncProgress } from './icloudSyncProgress';
import {
  getIcloudSyncContentHashes,
  getIcloudSyncLastVersionId,
  setIcloudSyncContentHashes,
  setIcloudSyncLastError,
  setIcloudSyncLastSyncedAt,
  setIcloudSyncLastVersionId,
} from './icloudSyncState';
import {
  calculateIcloudSyncTimeout,
  ICLOUD_SYNC_TIMEOUT_ERROR,
  isIcloudSyncTimeoutError,
  withIcloudSyncTimeout,
} from './icloudSyncTimeout';

export type PushIcloudSnapshotResult = PushFileSnapshotResult;

function createIcloudPushAdapter(basePath: string, reportProgress: boolean): FileSyncPushAdapter {
  return {
    basePath,
    buildSnapshot: (records, folders) => buildIcloudSnapshot({ records, folders, basePath }),
    listExistingRelativePaths: () => listIcloudRelativePaths(basePath),
    writeFiles: async (input) => {
      await writeIcloudRelativeFiles({
        basePath,
        files: input.files,
        onProgress: input.onUploadProgress,
      });
      await deleteIcloudRelativePaths(input.deletions);
      const manifestContent = input.files.get(
        joinRepoPath(basePath, '.voice-inbox-ai/manifest.json'),
      );
      if (manifestContent) {
        await ensureIcloudDirectory(
          joinRepoPath(basePath, `${ICLOUD_SYNC_VERSIONS_DIR}/${input.versionId}`),
        );
        await writeIcloudRelativeFile(input.versionManifestPath, manifestContent);
      }
      for (const [path, content] of input.versionAuxiliaryFiles.entries()) {
        await writeIcloudRelativeFile(path, content);
      }
      input.onFinishing?.();
    },
    pruneOldVersions: async () => {
      const versionsRoot = joinRepoPath(basePath, ICLOUD_SYNC_VERSIONS_DIR);
      const exists = await listIcloudRelativePaths(versionsRoot).catch(() => [] as string[]);
      const versionIds = new Set<string>();
      for (const path of exists) {
        const relative = path.startsWith(`${versionsRoot}/`)
          ? path.slice(versionsRoot.length + 1)
          : path;
        const versionId = relative.split('/')[0];
        if (versionId) {
          versionIds.add(versionId);
        }
      }
      const sorted = [...versionIds].sort((a, b) => b.localeCompare(a));
      const stale = sorted.slice(ICLOUD_SYNC_MAX_VERSIONS);
      await Promise.all(
        stale.map((versionId) =>
          deleteIcloudDirectoryRecursive(
            joinRepoPath(basePath, joinRepoPath(ICLOUD_SYNC_VERSIONS_DIR, versionId)),
          ),
        ),
      );
    },
    getPreviousHashes: getIcloudSyncContentHashes,
    areHashesEqual: areIcloudSyncHashesEqual,
    getLastVersionId: getIcloudSyncLastVersionId,
    setLastVersionId: setIcloudSyncLastVersionId,
    setLastSyncedAt: setIcloudSyncLastSyncedAt,
    setContentHashes: setIcloudSyncContentHashes,
    setLastError: setIcloudSyncLastError,
    formatVersionLabel: formatIcloudVersionLabel,
    reportStage: reportProgress
      ? (stage) => {
          updateIcloudSyncProgress({ stage });
        }
      : undefined,
    reportUploadProgress: reportProgress
      ? (uploadCurrent, uploadTotal) => {
          updateIcloudSyncProgress({ stage: 'uploading', uploadCurrent, uploadTotal });
        }
      : undefined,
  };
}

export async function pushIcloudSnapshot(params: {
  basePath?: string;
  records?: VoiceRecord[];
  folders: Folder[];
  reportProgress?: boolean;
}): Promise<PushIcloudSnapshotResult> {
  const basePath = params.basePath ?? ICLOUD_SYNC_DEFAULT_BASE_PATH;
  const records = params.records ?? (await loadRecordsForRemoteSync());
  const { folders, reportProgress = false } = params;

  const snapshot = await buildIcloudSnapshot({ records, folders, basePath });
  const dynamicTimeout = calculateIcloudSyncTimeout(snapshot.files.size);

  return pushFileSnapshot({
    records,
    folders,
    adapter: createIcloudPushAdapter(basePath, reportProgress),
    isProActive: isProActiveFromStorageSync,
    withTimeout: <T>(promise: Promise<T>) => withIcloudSyncTimeout(promise, dynamicTimeout),
    isTimeoutError: isIcloudSyncTimeoutError,
    timeoutErrorMessage: ICLOUD_SYNC_TIMEOUT_ERROR,
  });
}

export async function readIcloudSyncFileAtVersion(params: {
  basePath: string;
  versionId: string;
  relativePath: string;
}): Promise<string | null> {
  const fullPath = joinRepoPath(
    params.basePath,
    `${ICLOUD_SYNC_VERSIONS_DIR}/${params.versionId}/${params.relativePath}`,
  );
  return readIcloudRelativeFile(fullPath);
}
