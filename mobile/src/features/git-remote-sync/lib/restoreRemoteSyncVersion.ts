import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';
import type { ImportResult } from '@/features/sync-data';
import {
  type BackupExportPayload,
  buildImportResultFromPayload,
  parseBackupMetadataPayload,
} from '@/features/sync-data';

import type { RemoteSyncAuxiliaryData } from './applyRemoteSyncAuxiliaryData';
import {
  REMOTE_SYNC_AI_SETTINGS_FILE,
  REMOTE_SYNC_PRIVATE_REMOTE_PROFILES_FILE,
} from './constants';
import { parseRemoteSyncAiSettings } from './remoteSyncAiSettings';
import { parseRemoteSyncPrivateProfiles } from './remoteSyncPrivateProfiles';
import { joinRepoPath, uniqueManifestPaths } from './repoPaths';

export type RestoreRemoteSyncResult =
  | {
      ok: true;
      importResult: Extract<ImportResult, { success: true }>;
      exportedAt: string;
      auxiliaryData: RemoteSyncAuxiliaryData;
    }
  | { ok: false; code: string; message?: string };

async function fetchOptionalJsonAtRef(params: {
  basePath: string;
  commitSha: string;
  relativePath: string;
  fetchFileAtRef: (filePath: string, commitSha: string) => Promise<string | null>;
}): Promise<unknown | null> {
  const raw = await params.fetchFileAtRef(
    joinRepoPath(params.basePath, params.relativePath),
    params.commitSha,
  );
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export async function restoreRemoteSyncVersion(params: {
  basePath: string;
  commitSha: string;
  fetchManifestAtRef: (manifestPath: string, commitSha: string) => Promise<string | null>;
  fetchFileAtRef?: (filePath: string, commitSha: string) => Promise<string | null>;
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

    let auxiliaryData: RemoteSyncAuxiliaryData = {
      aiSettings: null,
      privateRemoteProfiles: null,
    };
    if (params.fetchFileAtRef) {
      const [aiSettingsRaw, privateProfilesRaw] = await Promise.all([
        fetchOptionalJsonAtRef({
          basePath: params.basePath,
          commitSha: params.commitSha,
          relativePath: REMOTE_SYNC_AI_SETTINGS_FILE,
          fetchFileAtRef: params.fetchFileAtRef,
        }),
        fetchOptionalJsonAtRef({
          basePath: params.basePath,
          commitSha: params.commitSha,
          relativePath: REMOTE_SYNC_PRIVATE_REMOTE_PROFILES_FILE,
          fetchFileAtRef: params.fetchFileAtRef,
        }),
      ]);
      auxiliaryData = {
        aiSettings: aiSettingsRaw ? parseRemoteSyncAiSettings(aiSettingsRaw) : null,
        privateRemoteProfiles: privateProfilesRaw
          ? parseRemoteSyncPrivateProfiles(privateProfilesRaw)
          : null,
      };
    }

    return { ok: true, importResult, exportedAt: payload.exportedAt, auxiliaryData };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, code: 'restore_failed', message };
  }
}
