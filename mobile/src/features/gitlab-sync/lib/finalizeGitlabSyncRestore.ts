import type { Folder } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';
import { finalizeRemoteSyncRestore } from '@/features/git-remote-sync/lib/finalizeRemoteSyncRestore';

import { buildGitlabSnapshot } from './buildGitlabSnapshot';
import { getGitlabSyncSecrets } from './gitlabSecrets';
import {
  setGitlabSyncContentHashes,
  setGitlabSyncLastCommitSha,
  setGitlabSyncLastError,
  setGitlabSyncLastSyncedAt,
} from './gitlabSyncState';

/** Align local GitLab sync metadata after a successful restore import. */
export async function finalizeGitlabSyncRestore(params: {
  commitSha: string;
  records: VoiceRecord[];
  folders: Folder[];
  exportedAt: string;
}): Promise<void> {
  return finalizeRemoteSyncRestore({
    ...params,
    getBasePath: async () => (await getGitlabSyncSecrets())?.basePath ?? null,
    buildSnapshot: buildGitlabSnapshot,
    setLastCommitSha: setGitlabSyncLastCommitSha,
    setLastSyncedAt: setGitlabSyncLastSyncedAt,
    setContentHashes: setGitlabSyncContentHashes,
    setLastError: setGitlabSyncLastError,
  });
}
