import type { Folder } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';

import { buildGithubSnapshot } from './buildGithubSnapshot';
import { getGithubSyncSecrets } from './githubSecrets';
import {
  setGithubSyncContentHashes,
  setGithubSyncLastCommitSha,
  setGithubSyncLastError,
  setGithubSyncLastSyncedAt,
} from './githubSyncState';

/** Align local GitHub sync metadata after a successful restore import. */
export async function finalizeGithubSyncRestore(params: {
  commitSha: string;
  records: VoiceRecord[];
  folders: Folder[];
  exportedAt: string;
}): Promise<void> {
  const secrets = await getGithubSyncSecrets();
  if (!secrets) {
    return;
  }

  const snapshot = await buildGithubSnapshot({
    records: params.records,
    folders: params.folders,
    basePath: secrets.basePath,
  });

  setGithubSyncLastCommitSha(params.commitSha.trim());
  setGithubSyncLastSyncedAt(params.exportedAt.trim() || snapshot.manifest.exportedAt);
  setGithubSyncContentHashes(snapshot.contentHashes);
  setGithubSyncLastError(null);
}
