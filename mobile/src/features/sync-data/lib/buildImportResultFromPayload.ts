import type { VoiceRecord } from '@/entities/record';

import {
  type BackupExportPayload,
  type BackupGraphLayoutVersion,
  buildLegacyBackupFolders,
  normalizeBackupFolders,
  normalizeBackupGraphLayouts,
  normalizeImportedVoiceRecord,
} from './backupMetadata';
import type { ImportResult } from './importData';

function extractGraphLayouts(payload: BackupExportPayload): BackupGraphLayoutVersion[] {
  if (payload.version !== 4) {
    return [];
  }
  return normalizeBackupGraphLayouts(payload.graphLayouts);
}

export function buildImportResultFromPayload(
  payload: BackupExportPayload,
): Extract<ImportResult, { success: true }> {
  const records = payload.records.map((r) => {
    const record = normalizeImportedVoiceRecord(r) as VoiceRecord;
    delete (record as { audioPath?: string }).audioPath;
    return record;
  });

  return {
    success: true,
    records,
    folders:
      payload.version === 3 || payload.version === 4 ? normalizeBackupFolders(payload.folders) : [],
    legacyFolders:
      payload.version !== 3 && payload.version !== 4
        ? buildLegacyBackupFolders(payload.records)
        : [],
    exportedAt: payload.exportedAt,
    graphLayouts: extractGraphLayouts(payload),
  };
}
