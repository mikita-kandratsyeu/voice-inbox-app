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

export type PushGithubCommitResult =
  | { ok: true; commitSha: string; alreadyUpToDate: boolean }
  | { ok: false; code: string; message?: string };

async function pushGithubCommitInternal(params: {
  secrets: GithubSyncSecrets;
  records: VoiceRecord[];
  folders: Folder[];
}): Promise<PushGithubCommitResult> {
  const { secrets, records, folders } = params;
  const { accessToken, owner, repo, branch, basePath } = secrets;

  try {
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

    const commitSha = await createGithubCommitWithFiles({
      accessToken,
      owner,
      repo,
      branch,
      basePath,
      files: snapshot.files,
      deletions,
      message,
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
}): Promise<PushGithubCommitResult> {
  if (!isProActiveFromStorageSync()) {
    return { ok: false, code: 'pro_required' };
  }

  try {
    return await withGithubSyncTimeout(pushGithubCommitInternal(params));
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
