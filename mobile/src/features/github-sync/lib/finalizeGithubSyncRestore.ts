import type { Folder } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';
import { finalizeRemoteSyncRestore } from '@/features/git-remote-sync/lib/finalizeRemoteSyncRestore';

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
  return finalizeRemoteSyncRestore({
    ...params,
    getBasePath: async () => (await getGithubSyncSecrets())?.basePath ?? null,
    buildSnapshot: buildGithubSnapshot,
    setLastCommitSha: setGithubSyncLastCommitSha,
    setLastSyncedAt: setGithubSyncLastSyncedAt,
    setContentHashes: setGithubSyncContentHashes,
    setLastError: setGithubSyncLastError,
  });
}
