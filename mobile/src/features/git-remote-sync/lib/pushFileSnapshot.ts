import type { Folder } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';

import type { RemoteSnapshot } from './buildRemoteSnapshot';
import { computeRemoteSyncDiff, type RemoteSyncDiff } from './computeRemoteSyncDiff';
import {
  addPathVariants,
  isNoteMarkdownPath,
  isRemoteSyncAudioPath,
  toRelativeRepoPaths,
} from './repoPaths';

export type PushFileSnapshotResult =
  | { ok: true; versionId: string; alreadyUpToDate: boolean }
  | { ok: false; code: string; message?: string };

export type FileSyncPushProgressStage = 'preparing' | 'uploading' | 'finishing';

export type FileSyncPushAdapter = {
  basePath: string;
  buildSnapshot(records: VoiceRecord[], folders: Folder[]): Promise<RemoteSnapshot>;
  listExistingRelativePaths(): Promise<string[]>;
  writeFiles(input: {
    files: Map<string, string>;
    localBinaryFiles?: Map<string, string>;
    tempCleanupDirs?: string[];
    deletions: string[];
    versionId: string;
    versionMeta: Record<string, unknown>;
    versionManifestPath: string;
    versionAuxiliaryFiles: Map<string, string>;
    onUploadProgress?: (uploaded: number, total: number) => void;
    onFinishing?: () => void;
  }): Promise<void>;
  pruneOldVersions(): Promise<void>;
  getPreviousHashes(): Record<string, string>;
  areHashesEqual(current: Record<string, string>, previous: Record<string, string>): boolean;
  getLastVersionId(): string | null;
  setLastVersionId(id: string): void;
  setLastSyncedAt(iso: string): void;
  setContentHashes(hashes: Record<string, string>): void;
  setLastError(message: string | null): void;
  formatVersionLabel(params: {
    diff: RemoteSyncDiff;
    recordCount: number;
    folderCount: number;
    graphLayoutCount: number;
  }): string;
  reportStage?(stage: FileSyncPushProgressStage): void;
  reportUploadProgress?(uploaded: number, total: number): void;
};

function resolveDeletions(params: {
  adapter: FileSyncPushAdapter;
  basePath: string;
  snapshot: RemoteSnapshot;
  initialDeletions: string[];
}): Promise<string[]> {
  const { adapter, basePath, snapshot, initialDeletions } = params;

  return (async () => {
    let deletions = [...initialDeletions];
    try {
      const existingPaths = await adapter.listExistingRelativePaths();
      const currentNotePaths = new Set<string>();
      const currentAudioPaths = new Set<string>();
      for (const path of snapshot.files.keys()) {
        if (isNoteMarkdownPath(path)) {
          addPathVariants(currentNotePaths, path, basePath);
        }
      }
      for (const path of snapshot.localBinaryFiles?.keys() ?? []) {
        addPathVariants(currentAudioPaths, path, basePath);
      }
      for (const path of existingPaths) {
        if (isNoteMarkdownPath(path) && !currentNotePaths.has(path)) {
          deletions.push(path);
        } else if (isRemoteSyncAudioPath(path) && !currentAudioPaths.has(path)) {
          deletions.push(path);
        }
      }
    } catch {
      // Best-effort deletion detection.
    }
    deletions = [...new Set(deletions)];
    return deletions;
  })();
}

export function createVersionIdFromExportedAt(exportedAt: string): string {
  return exportedAt.replace(/[:.]/g, '-');
}

async function pushFileSnapshotInternal(params: {
  records: VoiceRecord[];
  folders: Folder[];
  adapter: FileSyncPushAdapter;
}): Promise<PushFileSnapshotResult> {
  const { records, folders, adapter } = params;
  const { basePath } = adapter;

  try {
    adapter.reportStage?.('preparing');
    const snapshot = await adapter.buildSnapshot(records, folders);
    const previousHashes = adapter.getPreviousHashes();
    const notesPrefix = `${basePath.replace(/^\/+|\/+$/g, '')}/notes`;

    if (
      Object.keys(previousHashes).length > 0 &&
      adapter.areHashesEqual(snapshot.contentHashes, previousHashes)
    ) {
      return {
        ok: true,
        versionId: adapter.getLastVersionId() ?? '',
        alreadyUpToDate: true,
      };
    }

    const diff = computeRemoteSyncDiff({
      currentHashes: snapshot.contentHashes,
      previousHashes,
      notePathPrefix: notesPrefix,
    });

    const deletions = await resolveDeletions({
      adapter,
      basePath,
      snapshot,
      initialDeletions: diff.deletionPaths,
    });

    const versionId = createVersionIdFromExportedAt(snapshot.manifest.exportedAt);
    const versionLabel = adapter.formatVersionLabel({
      diff,
      recordCount: snapshot.recordCount,
      folderCount: snapshot.folderCount,
      graphLayoutCount: snapshot.graphLayoutCount,
    });

    const versionMeta = {
      label: versionLabel,
      exportedAt: snapshot.manifest.exportedAt,
      recordCount: snapshot.recordCount,
      folderCount: snapshot.folderCount,
      graphLayoutCount: snapshot.graphLayoutCount,
    };

    const versionManifestPath = `${basePath}/.voice-inbox-ai/versions/${versionId}/manifest.json`;
    const versionAuxiliaryFiles = new Map<string, string>();
    const aiSettings = snapshot.files.get(`${basePath}/.voice-inbox-ai/ai-settings.json`);
    if (aiSettings) {
      versionAuxiliaryFiles.set(
        `${basePath}/.voice-inbox-ai/versions/${versionId}/ai-settings.json`,
        aiSettings,
      );
    }
    const privateProfiles = snapshot.files.get(
      `${basePath}/.voice-inbox-ai/private-remote-profiles.json`,
    );
    if (privateProfiles) {
      versionAuxiliaryFiles.set(
        `${basePath}/.voice-inbox-ai/versions/${versionId}/private-remote-profiles.json`,
        privateProfiles,
      );
    }
    versionAuxiliaryFiles.set(
      `${basePath}/.voice-inbox-ai/versions/${versionId}/version-meta.json`,
      JSON.stringify(versionMeta, null, 2),
    );

    const uploadTotal =
      snapshot.files.size + (snapshot.localBinaryFiles?.size ?? 0) + versionAuxiliaryFiles.size + 1;
    if (adapter.reportUploadProgress && uploadTotal > 0) {
      adapter.reportStage?.('uploading');
      adapter.reportUploadProgress(0, uploadTotal);
    }

    adapter.reportStage?.('finishing');
    await adapter.writeFiles({
      files: snapshot.files,
      localBinaryFiles: snapshot.localBinaryFiles,
      tempCleanupDirs: snapshot.tempCleanupDirs,
      deletions,
      versionId,
      versionMeta,
      versionManifestPath,
      versionAuxiliaryFiles,
      onUploadProgress: adapter.reportUploadProgress,
      onFinishing: () => adapter.reportStage?.('finishing'),
    });

    await adapter.pruneOldVersions();

    adapter.setLastVersionId(versionId);
    adapter.setLastSyncedAt(snapshot.manifest.exportedAt);
    adapter.setContentHashes(snapshot.contentHashes);
    adapter.setLastError(null);

    return { ok: true, versionId, alreadyUpToDate: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code =
      err instanceof Error && 'code' in err && typeof err.code === 'string'
        ? err.code
        : 'sync_failed';
    adapter.setLastError(message);
    return { ok: false, code, message };
  }
}

export async function pushFileSnapshot(params: {
  records: VoiceRecord[];
  folders: Folder[];
  adapter: FileSyncPushAdapter;
  isProActive: () => boolean;
  withTimeout: <T>(promise: Promise<T>) => Promise<T>;
  isTimeoutError: (err: unknown) => boolean;
  timeoutErrorMessage: string;
}): Promise<PushFileSnapshotResult> {
  if (!params.isProActive()) {
    return { ok: false, code: 'pro_required' };
  }

  try {
    return await params.withTimeout(
      pushFileSnapshotInternal({
        records: params.records,
        folders: params.folders,
        adapter: params.adapter,
      }),
    );
  } catch (err) {
    if (params.isTimeoutError(err)) {
      params.adapter.setLastError(params.timeoutErrorMessage);
      return { ok: false, code: 'sync_timeout' };
    }
    const message = err instanceof Error ? err.message : String(err);
    params.adapter.setLastError(message);
    return { ok: false, code: 'sync_failed', message };
  }
}

export { toRelativeRepoPaths };
