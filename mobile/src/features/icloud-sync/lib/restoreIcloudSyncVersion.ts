import type { VoiceRecord } from '@/entities/record';
import type { RemoteSyncAuxiliaryData } from '@/features/git-remote-sync/lib/applyRemoteSyncAuxiliaryData';
import {
  REMOTE_SYNC_AI_SETTINGS_FILE,
  REMOTE_SYNC_PRIVATE_REMOTE_PROFILES_FILE,
} from '@/features/git-remote-sync/lib/constants';
import { parseRemoteSyncAiSettings } from '@/features/git-remote-sync/lib/remoteSyncAiSettings';
import { parseRemoteSyncPrivateProfiles } from '@/features/git-remote-sync/lib/remoteSyncPrivateProfiles';
import type { RestoreRemoteSyncResult } from '@/features/git-remote-sync/lib/restoreRemoteSyncVersion';
import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';
import type { ImportResult } from '@/features/sync-data';
import {
  buildLegacyBackupFolders,
  normalizeBackupFolders,
  normalizeBackupGraphLayouts,
  normalizeImportedVoiceRecord,
  parseBackupMetadataPayload,
} from '@/features/sync-data/lib/backupMetadata';

import { ICLOUD_SYNC_DEFAULT_BASE_PATH } from './constants';
import { readIcloudSyncFileAtVersion } from './pushIcloudSnapshot';
import { restoreIcloudAudioForRecords } from './restoreIcloudAudioForRecords';

export type RestoreIcloudSyncResult = RestoreRemoteSyncResult;

async function fetchOptionalJsonAtVersion(params: {
  basePath: string;
  versionId: string;
  relativePath: string;
}): Promise<unknown | null> {
  const raw = await readIcloudSyncFileAtVersion({
    basePath: params.basePath,
    versionId: params.versionId,
    relativePath: params.relativePath,
  });
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export async function restoreIcloudSyncVersion(params: {
  basePath?: string;
  versionId: string;
}): Promise<RestoreIcloudSyncResult> {
  if (!isProActiveFromStorageSync()) {
    return { ok: false, code: 'pro_required' };
  }

  const basePath = params.basePath ?? ICLOUD_SYNC_DEFAULT_BASE_PATH;
  const { versionId } = params;

  try {
    const raw = await readIcloudSyncFileAtVersion({
      basePath,
      versionId,
      relativePath: 'manifest.json',
    });

    if (!raw) {
      return { ok: false, code: 'manifest_not_found' };
    }

    const payload = parseBackupMetadataPayload(JSON.parse(raw) as unknown);
    if (!payload) {
      return { ok: false, code: 'invalid_manifest' };
    }

    const normalizedRecords = payload.records.map(
      (r) => normalizeImportedVoiceRecord(r) as VoiceRecord,
    );
    const recordsWithAudio = await restoreIcloudAudioForRecords({
      basePath,
      records: normalizedRecords,
    });

    const importResult: Extract<ImportResult, { success: true }> = {
      success: true,
      records: recordsWithAudio,
      folders:
        payload.version === 3 || payload.version === 4
          ? normalizeBackupFolders(payload.folders)
          : [],
      legacyFolders:
        payload.version !== 3 && payload.version !== 4
          ? buildLegacyBackupFolders(payload.records)
          : [],
      exportedAt: payload.exportedAt,
      graphLayouts:
        payload.version === 4 ? normalizeBackupGraphLayouts(payload.graphLayouts) : [],
    };

    const [aiSettingsRaw, privateProfilesRaw] = await Promise.all([
      fetchOptionalJsonAtVersion({
        basePath,
        versionId,
        relativePath: REMOTE_SYNC_AI_SETTINGS_FILE.replace(/^\.voice-inbox-ai\//, ''),
      }),
      fetchOptionalJsonAtVersion({
        basePath,
        versionId,
        relativePath: REMOTE_SYNC_PRIVATE_REMOTE_PROFILES_FILE.replace(/^\.voice-inbox-ai\//, ''),
      }),
    ]);

    const auxiliaryData: RemoteSyncAuxiliaryData = {
      aiSettings: aiSettingsRaw ? parseRemoteSyncAiSettings(aiSettingsRaw) : null,
      privateRemoteProfiles: privateProfilesRaw
        ? parseRemoteSyncPrivateProfiles(privateProfilesRaw)
        : null,
    };

    return { ok: true, importResult, exportedAt: payload.exportedAt, auxiliaryData };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, code: 'restore_failed', message };
  }
}
