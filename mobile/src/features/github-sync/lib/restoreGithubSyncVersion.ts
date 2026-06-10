import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';
import type { ImportResult } from '@/features/sync-data';
import {
  type BackupExportPayload,
  buildImportResultFromPayload,
  parseBackupMetadataPayload,
} from '@/features/sync-data';

import { GITHUB_SYNC_MANIFEST_FILE } from './constants';
import { getFileContentAtRef } from './githubApi';
import type { GithubSyncSecrets } from './githubSecrets';

function joinRepoPath(basePath: string, ...segments: string[]): string {
  const base = basePath.replace(/^\/+|\/+$/g, '');
  const rest = segments.map((s) => s.replace(/^\/+|\/+$/g, '')).filter(Boolean);
  return [base, ...rest].join('/');
}

export type RestoreGithubSyncResult =
  | { ok: true; importResult: Extract<ImportResult, { success: true }> }
  | { ok: false; code: string; message?: string };

export async function restoreGithubSyncVersion(params: {
  secrets: GithubSyncSecrets;
  commitSha: string;
}): Promise<RestoreGithubSyncResult> {
  if (!isProActiveFromStorageSync()) {
    return { ok: false, code: 'pro_required' };
  }

  const { secrets, commitSha } = params;
  const manifestPath = joinRepoPath(secrets.basePath, GITHUB_SYNC_MANIFEST_FILE);

  try {
    const raw = await getFileContentAtRef(
      secrets.accessToken,
      secrets.owner,
      secrets.repo,
      manifestPath,
      commitSha,
    );

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
    return { ok: true, importResult };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, code: 'restore_failed', message };
  }
}
