import type { Folder } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';

import type { RemoteSnapshot } from './buildRemoteSnapshot';

export async function finalizeRemoteSyncRestore(params: {
  commitSha: string;
  records: VoiceRecord[];
  folders: Folder[];
  exportedAt: string;
  getBasePath: () => Promise<string | null>;
  buildSnapshot: (input: {
    records: VoiceRecord[];
    folders: Folder[];
    basePath: string;
  }) => Promise<RemoteSnapshot>;
  setLastCommitSha: (sha: string) => void;
  setLastSyncedAt: (iso: string) => void;
  setContentHashes: (hashes: Record<string, string>) => void;
  setLastError: (message: string | null) => void;
}): Promise<void> {
  const basePath = await params.getBasePath();
  if (!basePath) {
    return;
  }

  const snapshot = await params.buildSnapshot({
    records: params.records,
    folders: params.folders,
    basePath,
  });

  params.setLastCommitSha(params.commitSha.trim());
  params.setLastSyncedAt(params.exportedAt.trim() || snapshot.manifest.exportedAt);
  params.setContentHashes(snapshot.contentHashes);
  params.setLastError(null);
}
