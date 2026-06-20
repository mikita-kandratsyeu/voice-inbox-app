import type { Folder } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';
import { finalizeRemoteSyncRestore } from '@/features/git-remote-sync/lib/finalizeRemoteSyncRestore';

import { buildIcloudSnapshot } from './buildIcloudSnapshot';
import { ICLOUD_SYNC_DEFAULT_BASE_PATH } from './constants';
import {
  setIcloudSyncContentHashes,
  setIcloudSyncLastError,
  setIcloudSyncLastSyncedAt,
  setIcloudSyncLastVersionId,
} from './icloudSyncState';

export async function finalizeIcloudSyncRestore(params: {
  versionId: string;
  records: VoiceRecord[];
  folders: Folder[];
  exportedAt: string;
  basePath?: string;
}): Promise<void> {
  const basePath = params.basePath ?? ICLOUD_SYNC_DEFAULT_BASE_PATH;

  return finalizeRemoteSyncRestore({
    commitSha: params.versionId,
    records: params.records,
    folders: params.folders,
    exportedAt: params.exportedAt,
    getBasePath: async () => basePath,
    buildSnapshot: buildIcloudSnapshot,
    setLastCommitSha: setIcloudSyncLastVersionId,
    setLastSyncedAt: setIcloudSyncLastSyncedAt,
    setContentHashes: setIcloudSyncContentHashes,
    setLastError: setIcloudSyncLastError,
  });
}
