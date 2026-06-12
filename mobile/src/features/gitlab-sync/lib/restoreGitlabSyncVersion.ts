import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';
import type { ImportResult } from '@/features/sync-data';
import {
  type BackupExportPayload,
  buildImportResultFromPayload,
  parseBackupMetadataPayload,
} from '@/features/sync-data';

import { GITLAB_SYNC_MANIFEST_FILE } from './constants';
import { getFileContentAtRef } from './gitlabApi';
import type { GitlabSyncSecrets } from './gitlabSecrets';

export type RestoreGitlabSyncResult =
  | {
      ok: true;
      importResult: Extract<ImportResult, { success: true }>;
      exportedAt: string;
    }
  | { ok: false; code: string; message?: string };

function joinManifestRepoPath(basePath: string): string {
  const normalized = basePath.replace(/^\/+|\/+$/g, '');
  if (!normalized) {
    return GITLAB_SYNC_MANIFEST_FILE;
  }
  return `${normalized}/${GITLAB_SYNC_MANIFEST_FILE}`;
}

export async function restoreGitlabSyncVersion(params: {
  secrets: GitlabSyncSecrets;
  commitSha: string;
}): Promise<RestoreGitlabSyncResult> {
  if (!isProActiveFromStorageSync()) {
    return { ok: false, code: 'pro_required' };
  }

  const { secrets, commitSha } = params;
  const manifestPaths = [joinManifestRepoPath(secrets.basePath), GITLAB_SYNC_MANIFEST_FILE];

  try {
    let raw: string | null = null;
    for (const manifestPath of manifestPaths) {
      raw = await getFileContentAtRef(
        secrets.accessToken,
        secrets.projectId,
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
