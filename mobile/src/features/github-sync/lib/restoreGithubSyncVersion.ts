import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';
import type { ImportResult } from '@/features/sync-data';
import {
  type BackupExportPayload,
  buildImportResultFromPayload,
  parseBackupMetadataPayload,
} from '@/features/sync-data';

import { GITHUB_SYNC_LEGACY_MANIFEST_FILE, GITHUB_SYNC_MANIFEST_FILE } from './constants';
import { getFileContentAtRef } from './githubApi';
import type { GithubSyncSecrets } from './githubSecrets';

export type RestoreGithubSyncResult =
  | {
      ok: true;
      importResult: Extract<ImportResult, { success: true }>;
      exportedAt: string;
    }
  | { ok: false; code: string; message?: string };

function joinRepoPath(basePath: string, filePath: string): string {
  const normalized = basePath.replace(/^\/+|\/+$/g, '');
  if (!normalized) {
    return filePath;
  }
  return `${normalized}/${filePath.replace(/^\/+/, '')}`;
}

function uniqueManifestPaths(basePath: string): string[] {
  return [
    joinRepoPath(basePath, GITHUB_SYNC_MANIFEST_FILE),
    GITHUB_SYNC_MANIFEST_FILE,
    joinRepoPath(basePath, GITHUB_SYNC_LEGACY_MANIFEST_FILE),
    GITHUB_SYNC_LEGACY_MANIFEST_FILE,
  ].filter((path, index, arr) => arr.indexOf(path) === index);
}

export async function restoreGithubSyncVersion(params: {
  secrets: GithubSyncSecrets;
  commitSha: string;
}): Promise<RestoreGithubSyncResult> {
  if (!isProActiveFromStorageSync()) {
    return { ok: false, code: 'pro_required' };
  }

  const { secrets, commitSha } = params;
  const manifestPaths = uniqueManifestPaths(secrets.basePath);

  try {
    let raw: string | null = null;
    for (const manifestPath of manifestPaths) {
      raw = await getFileContentAtRef(
        secrets.accessToken,
        secrets.owner,
        secrets.repo,
        manifestPath,
        commitSha,
      );
      if (raw) {
        break;
      }
    }

    if (!raw) {
      return { ok: false, code: 'manifest_not_found' };
    }

    const payload = parseBackupMetadataPayload(JSON.parse(raw) as unknown);
    if (!payload) {
      return { ok: false, code: 'invalid_manifest' };
    }

    const stripped: BackupExportPayload = {
      ...payload,
      records: payload.records.map((r) => {
        const { audioPath: _audioPath, ...rest } = r as typeof r & { audioPath?: string };
        return rest;
      }),
    } as BackupExportPayload;

    const importResult = buildImportResultFromPayload(stripped);
    return { ok: true, importResult, exportedAt: payload.exportedAt };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, code: 'restore_failed', message };
  }
}
