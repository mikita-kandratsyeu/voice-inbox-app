import type { Folder } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';

import type { RemoteSnapshot } from './buildRemoteSnapshot';
import { computeRemoteSyncDiff, type RemoteSyncDiff } from './computeRemoteSyncDiff';
import { addPathVariants, isNoteMarkdownPath, toRelativeRepoPaths } from './repoPaths';

export type PushRemoteCommitResult =
  | { ok: true; commitSha: string; alreadyUpToDate: boolean }
  | { ok: false; code: string; message?: string };

export type RemoteSyncPushProgressStage = 'preparing' | 'uploading' | 'committing';

export type RemoteSyncPushAdapter = {
  accessToken: string;
  branch: string;
  basePath: string;
  trackExistingPathsWhenDeleting: boolean;
  verifyAuth(): Promise<void>;
  getBranchRefSha(): Promise<string | null>;
  listTreePathsAtCommit(parentSha: string): Promise<string[]>;
  createCommitWithFiles(input: {
    files: Map<string, string>;
    deletions: string[];
    existingRelativePaths?: ReadonlySet<string>;
    message: string;
    onUploadProgress?: (uploaded: number, total: number) => void;
    onCommitting?: () => void;
  }): Promise<string>;
  isRefConflictError(err: unknown): boolean;
  buildSnapshot(records: VoiceRecord[], folders: Folder[]): Promise<RemoteSnapshot>;
  getPreviousHashes(): Record<string, string>;
  areHashesEqual(current: Record<string, string>, previous: Record<string, string>): boolean;
  getLastCommitSha(): string | null;
  setLastCommitSha(sha: string): void;
  setLastSyncedAt(iso: string): void;
  setContentHashes(hashes: Record<string, string>): void;
  setLastError(message: string | null): void;
  formatCommitMessage(params: {
    diff: RemoteSyncDiff;
    recordCount: number;
    folderCount: number;
    graphLayoutCount: number;
  }): string;
  reportStage?(stage: RemoteSyncPushProgressStage): void;
  reportUploadProgress?(uploaded: number, total: number): void;
};

const DEFAULT_REF_CONFLICT_RETRIES = 2;

async function resolveDeletionsAndExistingPaths(params: {
  adapter: RemoteSyncPushAdapter;
  parentSha: string;
  basePath: string;
  snapshot: RemoteSnapshot;
  initialDeletions: string[];
}): Promise<{ deletions: string[]; existingRelativePaths?: Set<string> }> {
  const { adapter, parentSha, basePath, snapshot, initialDeletions } = params;
  let deletions = [...initialDeletions];
  let existingRelativePaths: Set<string> | undefined;

  const loadExistingPaths = async (): Promise<string[]> =>
    adapter.listTreePathsAtCommit(parentSha);

  if (deletions.length === 0) {
    try {
      const existingPaths = await loadExistingPaths();
      existingRelativePaths = toRelativeRepoPaths(existingPaths, basePath);
      const currentNotePaths = new Set<string>();
      for (const path of snapshot.files.keys()) {
        if (isNoteMarkdownPath(path)) {
          addPathVariants(currentNotePaths, path, basePath);
        }
      }
      for (const path of existingPaths) {
        if (isNoteMarkdownPath(path) && !currentNotePaths.has(path)) {
          deletions.push(path);
        }
      }
    } catch {
      // Best-effort deletion detection.
    }
    return { deletions, existingRelativePaths };
  }

  if (!adapter.trackExistingPathsWhenDeleting) {
    return { deletions };
  }

  try {
    const existingPaths = await loadExistingPaths();
    existingRelativePaths = toRelativeRepoPaths(existingPaths, basePath);
  } catch {
    // Best-effort path lookup.
  }

  return { deletions, existingRelativePaths };
}

async function pushRemoteCommitInternal(params: {
  records: VoiceRecord[];
  folders: Folder[];
  adapter: RemoteSyncPushAdapter;
}): Promise<PushRemoteCommitResult> {
  const { records, folders, adapter } = params;
  const { basePath } = adapter;

  try {
    adapter.reportStage?.('preparing');
    try {
      await adapter.verifyAuth();
    } catch (authErr) {
      const authStatus =
        authErr instanceof Error && 'status' in authErr && typeof authErr.status === 'number'
          ? authErr.status
          : undefined;
      if (authStatus === 401) {
        return { ok: false, code: 'unauthorized' };
      }
      throw authErr;
    }

    const snapshot = await adapter.buildSnapshot(records, folders);
    const previousHashes = adapter.getPreviousHashes();
    const notesPrefix = `${basePath.replace(/^\/+|\/+$/g, '')}/notes`;

    if (
      Object.keys(previousHashes).length > 0 &&
      adapter.areHashesEqual(snapshot.contentHashes, previousHashes)
    ) {
      return {
        ok: true,
        commitSha: adapter.getLastCommitSha() ?? '',
        alreadyUpToDate: true,
      };
    }

    const diff = computeRemoteSyncDiff({
      currentHashes: snapshot.contentHashes,
      previousHashes,
      notePathPrefix: notesPrefix,
    });

    const parentSha = await adapter.getBranchRefSha();
    let deletions = [...diff.deletionPaths];
    let existingRelativePaths: Set<string> | undefined;

    if (parentSha) {
      const resolved = await resolveDeletionsAndExistingPaths({
        adapter,
        parentSha,
        basePath,
        snapshot,
        initialDeletions: deletions,
      });
      deletions = resolved.deletions;
      existingRelativePaths = resolved.existingRelativePaths;
    }

    const message = adapter.formatCommitMessage({
      diff,
      recordCount: snapshot.recordCount,
      folderCount: snapshot.folderCount,
      graphLayoutCount: snapshot.graphLayoutCount,
    });

    const uploadTotal = snapshot.files.size;
    if (adapter.reportUploadProgress && uploadTotal > 0) {
      adapter.reportStage?.('uploading');
      adapter.reportUploadProgress(0, uploadTotal);
    }

    const commitSha = await adapter.createCommitWithFiles({
      files: snapshot.files,
      deletions,
      existingRelativePaths,
      message,
      onUploadProgress: adapter.reportUploadProgress,
      onCommitting: adapter.reportStage ? () => adapter.reportStage?.('committing') : undefined,
    });

    adapter.setLastCommitSha(commitSha);
    adapter.setLastSyncedAt(snapshot.manifest.exportedAt);
    adapter.setContentHashes(snapshot.contentHashes);
    adapter.setLastError(null);

    return { ok: true, commitSha, alreadyUpToDate: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status =
      err instanceof Error && 'status' in err && typeof err.status === 'number'
        ? err.status
        : undefined;
    adapter.setLastError(message);
    if (status === 401) {
      return { ok: false, code: 'unauthorized', message };
    }
    if (adapter.isRefConflictError(err)) {
      return { ok: false, code: 'ref_conflict' };
    }
    return { ok: false, code: 'sync_failed', message };
  }
}

export async function pushRemoteCommit(params: {
  records: VoiceRecord[];
  folders: Folder[];
  reportProgress?: boolean;
  adapter: RemoteSyncPushAdapter;
  isProActive: () => boolean;
  refConflictRetries?: number;
  withTimeout: <T>(promise: Promise<T>) => Promise<T>;
  isTimeoutError: (err: unknown) => boolean;
  timeoutErrorMessage: string;
}): Promise<PushRemoteCommitResult> {
  if (!params.isProActive()) {
    return { ok: false, code: 'pro_required' };
  }

  const refConflictRetries = params.refConflictRetries ?? DEFAULT_REF_CONFLICT_RETRIES;

  try {
    const pushWithRefRetries = async (): Promise<PushRemoteCommitResult> => {
      let lastResult: PushRemoteCommitResult = { ok: false, code: 'sync_failed' };
      for (let attempt = 0; attempt <= refConflictRetries; attempt += 1) {
        lastResult = await pushRemoteCommitInternal({
          records: params.records,
          folders: params.folders,
          adapter: params.adapter,
        });
        if (lastResult.ok || lastResult.code !== 'ref_conflict') {
          return lastResult;
        }
      }
      return lastResult;
    };

    return await params.withTimeout(pushWithRefRetries());
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
