import type { Folder } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';

import { buildGitlabSnapshot } from './buildGitlabSnapshot';
import { getGitlabSyncSecrets } from './gitlabSecrets';
import {
  setGitlabSyncContentHashes,
  setGitlabSyncLastCommitSha,
  setGitlabSyncLastError,
  setGitlabSyncLastSyncedAt,
} from './gitlabSyncState';

/** Align local GitHub sync metadata after a successful restore import. */
export async function finalizeGitlabSyncRestore(params: {
  commitSha: string;
  records: VoiceRecord[];
  folders: Folder[];
  exportedAt: string;
}): Promise<void> {
  const secrets = await getGitlabSyncSecrets();
  if (!secrets) {
    return;
  }

  const snapshot = await buildGitlabSnapshot({
    records: params.records,
    folders: params.folders,
    basePath: secrets.basePath,
  });

  setGitlabSyncLastCommitSha(params.commitSha.trim());
  setGitlabSyncLastSyncedAt(params.exportedAt.trim() || snapshot.manifest.exportedAt);
  setGitlabSyncContentHashes(snapshot.contentHashes);
  setGitlabSyncLastError(null);
}
