import dayjs from 'dayjs';
import { Share } from 'react-native';
import { type EncryptionMethods, zip, zipWithPassword } from 'react-native-zip-archive';

import type { Folder } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';
import { i18n } from '@/shared/lib';
import { diagWarn } from '@/shared/lib/appLogger';
import { getCachesDirectoryPath, NitroFS } from '@/shared/lib/fs';

import type { BackupGraphLayoutVersion } from './backupMetadata';
import { BACKUP_ZIP_ENCRYPTION } from './backupZip';
import { listNotesGraphLayoutsForBackup } from './notesGraphLayoutBackup';

const METADATA_FILENAME = 'metadata.json';
const AUDIO_DIR_NAME = 'audio';

type ExportPayload = {
  version: 4;
  exportedAt: string;
  folders: Folder[];
  records: (Omit<VoiceRecord, 'audioPath'> & { audioPath?: string })[];
  graphLayouts: BackupGraphLayoutVersion[];
};

async function removeDirRecursive(path: string): Promise<void> {
  const items = await NitroFS.readdir(path);
  for (const item of items) {
    const st = await NitroFS.stat(item.path);
    if (st.isFile) {
      await NitroFS.unlink(item.path);
    } else {
      await removeDirRecursive(item.path);
    }
  }
  await NitroFS.unlink(path);
}

async function unlinkIfExists(path: string): Promise<void> {
  try {
    const exists = await NitroFS.exists(path);
    if (exists) {
      await NitroFS.unlink(path);
    }
  } catch {
    diagWarn('[unlinkIfExists] failed to unlink', { path });
  }
}

async function removeDirRecursiveIfExists(path: string): Promise<void> {
  try {
    const exists = await NitroFS.exists(path);
    if (exists) {
      await removeDirRecursive(path);
    }
  } catch {
    diagWarn('[removeDirRecursiveIfExists] failed to remove directory', { path });
  }
}

function getAudioExtension(audioPath: string): string {
  const match = audioPath.match(/\.[a-zA-Z0-9]+$/);
  return match?.[0] ?? '.m4a';
}

export type ExportDataOptions = {
  password?: string;
};

export const exportData = async (
  records: VoiceRecord[],
  folders: Folder[],
  options?: ExportDataOptions,
): Promise<void> => {
  const timestamp = Date.now();
  const password = options?.password?.trim();
  const isPasswordProtected = Boolean(password);
  const cache = getCachesDirectoryPath();
  const exportDir = `${cache}/voice-inbox-export-${timestamp}`;
  const audioDir = `${exportDir}/${AUDIO_DIR_NAME}`;
  const zipBasename = isPasswordProtected
    ? `voice-inbox-backup-locked-${timestamp}`
    : `voice-inbox-backup-${timestamp}`;
  const zipPath = `${cache}/${zipBasename}.zip`;

  try {
    await NitroFS.mkdir(exportDir);
    await NitroFS.mkdir(audioDir);

    const recordsForPayload: ExportPayload['records'] = [];

    for (const record of records) {
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
            recordsForPayload.push(record);
          }
        } else {
          recordsForPayload.push(record);
        }
      } else {
        recordsForPayload.push(record);
      }
    }

    const graphLayouts = await listNotesGraphLayoutsForBackup();

    const payload: ExportPayload = {
      version: 4,
      exportedAt: dayjs().toISOString(),
      folders,
      records: recordsForPayload,
      graphLayouts,
    };

    const json = JSON.stringify(payload, null, 2);
    await NitroFS.writeFile(`${exportDir}/${METADATA_FILENAME}`, json, 'utf8');

    if (password) {
      await zipWithPassword(
        exportDir,
        zipPath,
        password,
        BACKUP_ZIP_ENCRYPTION as EncryptionMethods,
      );
    } else {
      await zip(exportDir, zipPath);
    }

    await Share.share({
      url: `file://${zipPath}`,
      title: i18n.t('export.title'),
    });
  } finally {
    await removeDirRecursiveIfExists(exportDir);
    await unlinkIfExists(zipPath);
  }
};
