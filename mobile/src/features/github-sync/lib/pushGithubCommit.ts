import type { Folder } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';
import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';

import { buildGithubSnapshot } from './buildGithubSnapshot';
import { areGithubSyncHashesEqual, computeGithubSyncDiff } from './computeGithubSyncDiff';
import { formatGithubCommitMessage } from './formatGithubCommitMessage';
import {
  createGithubCommitWithFiles,
  fetchGithubUserLogin,
  getBranchRefSha,
  isGithubApiError,
  listTreePathsAtCommit,
} from './githubApi';
import type { GithubSyncSecrets } from './githubSecrets';
import { updateGithubSyncProgress } from './githubSyncProgress';
import {
  getGithubSyncContentHashes,
  getGithubSyncLastCommitSha,
  setGithubSyncContentHashes,
  setGithubSyncLastCommitSha,
  setGithubSyncLastError,
  setGithubSyncLastSyncedAt,
} from './githubSyncState';
import {
  GITHUB_SYNC_TIMEOUT_ERROR,
  isGithubSyncTimeoutError,
  withGithubSyncTimeout,
} from './githubSyncTimeout';

const PUSH_REF_CONFLICT_RETRIES = 2;

export type PushGithubCommitResult =
  | { ok: true; commitSha: string; alreadyUpToDate: boolean }
  | { ok: false; code: string; message?: string };

async function pushGithubCommitInternal(params: {
  secrets: GithubSyncSecrets;
  records: VoiceRecord[];
  folders: Folder[];
  reportProgress?: boolean;
}): Promise<PushGithubCommitResult> {
  const { secrets, records, folders, reportProgress = false } = params;
  const { accessToken, owner, repo, branch, basePath } = secrets;

  const reportStage = (stage: 'preparing' | 'uploading' | 'committing') => {
    if (!reportProgress) return;
    updateGithubSyncProgress({ stage });
  };

  try {
    reportStage('preparing');
    try {
      await fetchGithubUserLogin(accessToken);
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

    const snapshot = await buildGithubSnapshot({ records, folders, basePath });
    const previousHashes = getGithubSyncContentHashes();
    const notesPrefix = `${basePath.replace(/^\/+|\/+$/g, '')}/notes`;

    if (
      Object.keys(previousHashes).length > 0 &&
      areGithubSyncHashesEqual(snapshot.contentHashes, previousHashes)
    ) {
      return {
        ok: true,
        commitSha: getGithubSyncLastCommitSha() ?? '',
        alreadyUpToDate: true,
      };
    }

    const diff = computeGithubSyncDiff({
      currentHashes: snapshot.contentHashes,
      previousHashes,
      notePathPrefix: notesPrefix,
    });

    let deletions = [...diff.deletionPaths];
    const parentSha = await getBranchRefSha(accessToken, owner, repo, branch);
    if (parentSha && deletions.length === 0) {
      try {
        const existingPaths = await listTreePathsAtCommit(
          accessToken,
          owner,
          repo,
          parentSha,
          basePath,
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
    }

    const message = formatGithubCommitMessage({
      diff,
      recordCount: snapshot.recordCount,
      folderCount: snapshot.folderCount,
      graphLayoutCount: snapshot.graphLayoutCount,
    });

    const uploadTotal = snapshot.files.size;
    if (reportProgress && uploadTotal > 0) {
      updateGithubSyncProgress({ stage: 'uploading', uploadCurrent: 0, uploadTotal });
    }

    const commitSha = await createGithubCommitWithFiles({
      accessToken,
      owner,
      repo,
      branch,
      basePath,
      files: snapshot.files,
      deletions,
      message,
      onUploadProgress: reportProgress
        ? (uploaded, total) => {
            updateGithubSyncProgress({
              stage: 'uploading',
              uploadCurrent: uploaded,
              uploadTotal: total,
            });
          }
        : undefined,
      onCommitting: reportProgress ? () => reportStage('committing') : undefined,
    });

    setGithubSyncLastCommitSha(commitSha);
    setGithubSyncLastSyncedAt(snapshot.manifest.exportedAt);
    setGithubSyncContentHashes(snapshot.contentHashes);
    setGithubSyncLastError(null);

    return { ok: true, commitSha, alreadyUpToDate: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status =
      err instanceof Error && 'status' in err && typeof err.status === 'number'
        ? err.status
        : undefined;
    setGithubSyncLastError(message);
    if (status === 401) {
      return { ok: false, code: 'unauthorized', message };
    }
    if (isGithubApiError(err) && err.code === 'ref_conflict') {
      return { ok: false, code: 'ref_conflict' };
    }
    return { ok: false, code: 'sync_failed', message };
  }
}

export async function pushGithubCommit(params: {
  secrets: GithubSyncSecrets;
  records: VoiceRecord[];
  folders: Folder[];
  reportProgress?: boolean;
}): Promise<PushGithubCommitResult> {
  if (!isProActiveFromStorageSync()) {
    return { ok: false, code: 'pro_required' };
  }

  try {
    const pushWithRefRetries = async (): Promise<PushGithubCommitResult> => {
      let lastResult: PushGithubCommitResult = { ok: false, code: 'sync_failed' };
      for (let attempt = 0; attempt <= PUSH_REF_CONFLICT_RETRIES; attempt += 1) {
        lastResult = await pushGithubCommitInternal(params);
        if (lastResult.ok || lastResult.code !== 'ref_conflict') {
          return lastResult;
        }
      }
      return lastResult;
    };
    return await withGithubSyncTimeout(pushWithRefRetries());
  } catch (err) {
    if (isGithubSyncTimeoutError(err)) {
      setGithubSyncLastError(GITHUB_SYNC_TIMEOUT_ERROR);
      return { ok: false, code: 'sync_timeout' };
    }
    const message = err instanceof Error ? err.message : String(err);
    setGithubSyncLastError(message);
    return { ok: false, code: 'sync_failed', message };
  }
}
