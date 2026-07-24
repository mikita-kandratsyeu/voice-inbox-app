import dayjs from 'dayjs';

import type { Folder } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';
import { diagWarn } from '@/shared/lib/appLogger';
import { NitroFS } from '@/shared/lib/fs';

import type { BackupGraphLayoutVersion } from './backupMetadata';
import { listNotesGraphLayoutsForBackup } from './notesGraphLayoutBackup';

const AUDIO_DIR_NAME = 'audio';

export type BackupPayloadV4 = {
  version: 4;
  exportedAt: string;
  folders: Folder[];
  records: (Omit<VoiceRecord, 'audioPath'> & { audioPath?: string })[];
  graphLayouts: BackupGraphLayoutVersion[];
};

export type BuildBackupPayloadOptions = {
  includeAudio?: boolean;
  exportDir?: string;
};

function getAudioExtension(audioPath: string): string {
  const match = audioPath.match(/\.[a-zA-Z0-9]+$/);
  return match?.[0] ?? '.m4a';
}

export async function buildBackupPayload(
  records: VoiceRecord[],
  folders: Folder[],
  options?: BuildBackupPayloadOptions,
): Promise<BackupPayloadV4> {
  const includeAudio = options?.includeAudio === true;
  const exportDir = options?.exportDir?.trim();
  const audioDir =
    includeAudio && exportDir ? `${exportDir.replace(/\/+$/, '')}/${AUDIO_DIR_NAME}` : null;

  if (includeAudio && audioDir) {
    await NitroFS.mkdir(audioDir);
  }

  const recordsForPayload: BackupPayloadV4['records'] = [];

  for (const record of records) {
    if (!includeAudio || !audioDir) {
      const { audioPath: _audioPath, ...withoutAudio } = record;
      recordsForPayload.push(withoutAudio);
      continue;
    }

    const srcPath = record.audioPath?.trim();
    if (srcPath) {
      const normalizedSrc = srcPath.startsWith('file://') ? srcPath.slice(7) : srcPath;
      const exists = await NitroFS.exists(normalizedSrc);
      if (exists) {
        const ext = getAudioExtension(normalizedSrc);
        const destPath = `${audioDir}/${record.id}${ext}`;
        try {
          await NitroFS.copyFile(normalizedSrc, destPath);
          recordsForPayload.push({
            ...record,
            audioPath: `${AUDIO_DIR_NAME}/${record.id}${ext}`,
          });
        } catch {
          const { audioPath: _audioPath, ...withoutAudio } = record;
          recordsForPayload.push(withoutAudio);
        }
      } else {
        const { audioPath: _audioPath, ...withoutAudio } = record;
        recordsForPayload.push(withoutAudio);
      }
    } else {
      const { audioPath: _audioPath, ...withoutAudio } = record;
      recordsForPayload.push(withoutAudio);
    }
  }

  const graphLayouts = await listNotesGraphLayoutsForBackup();

  return {
    version: 4,
    exportedAt: dayjs().toISOString(),
    folders,
    records: recordsForPayload,
    graphLayouts,
  };
}

export async function prepareBackupExportDirectory(exportDir: string): Promise<void> {
  try {
    await NitroFS.mkdir(exportDir);
  } catch {
    diagWarn('[prepareBackupExportDirectory] mkdir failed', { exportDir });
  }
}
