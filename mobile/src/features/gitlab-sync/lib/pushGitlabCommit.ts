import type { Folder } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';
import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';

import { buildGitlabSnapshot } from './buildGitlabSnapshot';
import { areGitlabSyncHashesEqual, computeGitlabSyncDiff } from './computeGitlabSyncDiff';
import { formatGitlabCommitMessage } from './formatGitlabCommitMessage';
import {
  createGitlabCommitWithFiles,
  fetchGitlabUserLogin,
  getBranchRefSha,
  isGitlabApiError,
  listTreePathsAtCommit,
} from './gitlabApi';
import type { GitlabSyncSecrets } from './gitlabSecrets';
import { updateGitlabSyncProgress } from './gitlabSyncProgress';
import {
  getGitlabSyncContentHashes,
  getGitlabSyncLastCommitSha,
  setGitlabSyncContentHashes,
  setGitlabSyncLastCommitSha,
  setGitlabSyncLastError,
  setGitlabSyncLastSyncedAt,
} from './gitlabSyncState';
import {
  GITLAB_SYNC_TIMEOUT_ERROR,
  isGitlabSyncTimeoutError,
  withGitlabSyncTimeout,
} from './gitlabSyncTimeout';

const PUSH_REF_CONFLICT_RETRIES = 2;

export type PushGitlabCommitResult =
  | { ok: true; commitSha: string; alreadyUpToDate: boolean }
  | { ok: false; code: string; message?: string };

async function pushGitlabCommitInternal(params: {
  secrets: GitlabSyncSecrets;
  records: VoiceRecord[];
  folders: Folder[];
  reportProgress?: boolean;
}): Promise<PushGitlabCommitResult> {
  const { secrets, records, folders, reportProgress = false } = params;
  const { accessToken, projectId, branch, basePath } = secrets;

  const reportStage = (stage: 'preparing' | 'uploading' | 'committing') => {
    if (!reportProgress) return;
    updateGitlabSyncProgress({ stage });
  };

  try {
    reportStage('preparing');
    try {
      await fetchGitlabUserLogin(accessToken);
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

    const snapshot = await buildGitlabSnapshot({ records, folders, basePath });
    const previousHashes = getGitlabSyncContentHashes();
    const notesPrefix = `${basePath.replace(/^\/+|\/+$/g, '')}/notes`;

    if (
      Object.keys(previousHashes).length > 0 &&
      areGitlabSyncHashesEqual(snapshot.contentHashes, previousHashes)
    ) {
      return {
        ok: true,
        commitSha: getGitlabSyncLastCommitSha() ?? '',
        alreadyUpToDate: true,
      };
    }

    const diff = computeGitlabSyncDiff({
      currentHashes: snapshot.contentHashes,
      previousHashes,
      notePathPrefix: notesPrefix,
    });

    let deletions = [...diff.deletionPaths];
    const parentSha = await getBranchRefSha(accessToken, projectId, branch);
    let existingRelativePaths: Set<string> | undefined;
    if (parentSha && deletions.length === 0) {
      try {
        const existingPaths = await listTreePathsAtCommit(
          accessToken,
          projectId,
          parentSha,
          basePath,
        );
        existingRelativePaths = new Set(
          existingPaths.map((path) => {
            const normalizedBase = basePath.replace(/^\/+|\/+$/g, '');
            if (normalizedBase && path.startsWith(`${normalizedBase}/`)) {
              return path.slice(normalizedBase.length + 1);
            }
            return path.replace(/^\/+/, '');
          }),
        );
        const currentNotePaths = new Set(
          [...snapshot.files.keys()].filter((p) => p.includes('/notes/') && p.endsWith('.md')),
        );
        for (const path of existingPaths) {
          if (path.includes('/notes/') && path.endsWith('.md') && !currentNotePaths.has(path)) {
            deletions.push(path);
          }
        }
      } catch {
        // Best-effort deletion detection.
      }
    } else if (parentSha) {
      try {
        const existingPaths = await listTreePathsAtCommit(
          accessToken,
          projectId,
          parentSha,
          basePath,
        );
        existingRelativePaths = new Set(
          existingPaths.map((path) => {
            const normalizedBase = basePath.replace(/^\/+|\/+$/g, '');
            if (normalizedBase && path.startsWith(`${normalizedBase}/`)) {
              return path.slice(normalizedBase.length + 1);
            }
            return path.replace(/^\/+/, '');
          }),
        );
      } catch {
        // Best-effort path lookup.
      }
    }

    const message = formatGitlabCommitMessage({
      diff,
      recordCount: snapshot.recordCount,
      folderCount: snapshot.folderCount,
      graphLayoutCount: snapshot.graphLayoutCount,
    });

    const uploadTotal = snapshot.files.size;
    if (reportProgress && uploadTotal > 0) {
      updateGitlabSyncProgress({ stage: 'uploading', uploadCurrent: 0, uploadTotal });
    }

    const commitSha = await createGitlabCommitWithFiles({
      accessToken,
      projectId,
      branch,
      basePath,
      files: snapshot.files,
      deletions,
      existingRelativePaths,
      message,
      onUploadProgress: reportProgress
        ? (uploaded, total) => {
            updateGitlabSyncProgress({
              stage: 'uploading',
              uploadCurrent: uploaded,
              uploadTotal: total,
            });
          }
        : undefined,
      onCommitting: reportProgress ? () => reportStage('committing') : undefined,
    });

    setGitlabSyncLastCommitSha(commitSha);
    setGitlabSyncLastSyncedAt(snapshot.manifest.exportedAt);
    setGitlabSyncContentHashes(snapshot.contentHashes);
    setGitlabSyncLastError(null);

    return { ok: true, commitSha, alreadyUpToDate: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status =
      err instanceof Error && 'status' in err && typeof err.status === 'number'
        ? err.status
        : undefined;
    setGitlabSyncLastError(message);
    if (status === 401) {
      return { ok: false, code: 'unauthorized', message };
    }
    if (isGitlabApiError(err) && err.code === 'ref_conflict') {
      return { ok: false, code: 'ref_conflict' };
    }
    return { ok: false, code: 'sync_failed', message };
  }
}

export async function pushGitlabCommit(params: {
  secrets: GitlabSyncSecrets;
  records: VoiceRecord[];
  folders: Folder[];
  reportProgress?: boolean;
}): Promise<PushGitlabCommitResult> {
  if (!isProActiveFromStorageSync()) {
    return { ok: false, code: 'pro_required' };
  }

  try {
    const pushWithRefRetries = async (): Promise<PushGitlabCommitResult> => {
      let lastResult: PushGitlabCommitResult = { ok: false, code: 'sync_failed' };
      for (let attempt = 0; attempt <= PUSH_REF_CONFLICT_RETRIES; attempt += 1) {
        lastResult = await pushGitlabCommitInternal(params);
        if (lastResult.ok || lastResult.code !== 'ref_conflict') {
          return lastResult;
        }
      }
      return lastResult;
    };
    return await withGitlabSyncTimeout(pushWithRefRetries());
  } catch (err) {
    if (isGitlabSyncTimeoutError(err)) {
      setGitlabSyncLastError(GITLAB_SYNC_TIMEOUT_ERROR);
      return { ok: false, code: 'sync_timeout' };
    }
    const message = err instanceof Error ? err.message : String(err);
    setGitlabSyncLastError(message);
    return { ok: false, code: 'sync_failed', message };
  }
}
