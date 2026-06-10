import { Share } from 'react-native';
import { type EncryptionMethods, zip, zipWithPassword } from 'react-native-zip-archive';

import type { Folder } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';
import { i18n } from '@/shared/lib';
import { diagWarn } from '@/shared/lib/appLogger';
import { getCachesDirectoryPath, NitroFS } from '@/shared/lib/fs';

import { BACKUP_ZIP_ENCRYPTION } from './backupZip';
import { buildBackupPayload, prepareBackupExportDirectory } from './buildBackupPayload';

const METADATA_FILENAME = 'metadata.json';

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
  const exportDir = `${cache}/voice-inbox-ai-export-${timestamp}`;
  const zipBasename = isPasswordProtected
    ? `voice-inbox-ai-backup-locked-${timestamp}`
    : `voice-inbox-ai-backup-${timestamp}`;
  const zipPath = `${cache}/${zipBasename}.zip`;

  try {
    await prepareBackupExportDirectory(exportDir);

    const payload = await buildBackupPayload(records, folders, {
      includeAudio: true,
      exportDir,
    });

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
