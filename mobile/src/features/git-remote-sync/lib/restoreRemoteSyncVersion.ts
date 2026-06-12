import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';
import type { ImportResult } from '@/features/sync-data';
import {
  type BackupExportPayload,
  buildImportResultFromPayload,
  parseBackupMetadataPayload,
} from '@/features/sync-data';

import { uniqueManifestPaths } from './repoPaths';

export type RestoreRemoteSyncResult =
  | {
      ok: true;
      importResult: Extract<ImportResult, { success: true }>;
      exportedAt: string;
    }
  | { ok: false; code: string; message?: string };

export async function restoreRemoteSyncVersion(params: {
  basePath: string;
  commitSha: string;
  fetchManifestAtRef: (manifestPath: string, commitSha: string) => Promise<string | null>;
}): Promise<RestoreRemoteSyncResult> {
  if (!isProActiveFromStorageSync()) {
    return { ok: false, code: 'pro_required' };
  }

  const manifestPaths = uniqueManifestPaths(params.basePath);

  try {
    let raw: string | null = null;
    for (const manifestPath of manifestPaths) {
      raw = await params.fetchManifestAtRef(manifestPath, params.commitSha);
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
