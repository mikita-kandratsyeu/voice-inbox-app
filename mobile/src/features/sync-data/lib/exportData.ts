import { Share } from 'react-native';
import RNFS from 'react-native-fs';
import { zip } from 'react-native-zip-archive';

import type { Folder } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';

const METADATA_FILENAME = 'metadata.json';
const AUDIO_DIR_NAME = 'audio';

type ExportPayload = {
  version: 3;
  exportedAt: string;
  folders: Folder[];
  records: (Omit<VoiceRecord, 'audioPath'> & { audioPath?: string })[];
};

async function removeDirRecursive(path: string): Promise<void> {
  const items = await RNFS.readDir(path);
  for (const item of items) {
    if (item.isFile()) {
      await RNFS.unlink(item.path);
    } else {
      await removeDirRecursive(item.path);
    }
  }
  await RNFS.unlink(path);
}

function getAudioExtension(audioPath: string): string {
  const match = audioPath.match(/\.[a-zA-Z0-9]+$/);
  return match?.[0] ?? '.m4a';
}

export const exportData = async (records: VoiceRecord[], folders: Folder[]): Promise<void> => {
  const timestamp = Date.now();
  const exportDir = `${RNFS.CachesDirectoryPath}/voice-inbox-export-${timestamp}`;
  const audioDir = `${exportDir}/${AUDIO_DIR_NAME}`;
  const zipPath = `${RNFS.CachesDirectoryPath}/voice-inbox-backup-${timestamp}.zip`;

  await RNFS.mkdir(exportDir);
  await RNFS.mkdir(audioDir);

  const recordsForPayload: ExportPayload['records'] = [];

  for (const record of records) {
    const srcPath = record.audioPath?.trim();
    if (srcPath) {
      const normalizedSrc = srcPath.startsWith('file://') ? srcPath.slice(7) : srcPath;
      const exists = await RNFS.exists(normalizedSrc);
      if (exists) {
        const ext = getAudioExtension(normalizedSrc);
        const destPath = `${audioDir}/${record.id}${ext}`;
        try {
          await RNFS.copyFile(normalizedSrc, destPath);
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

  const payload: ExportPayload = {
    version: 3,
    exportedAt: new Date().toISOString(),
    folders,
    records: recordsForPayload,
  };

  const json = JSON.stringify(payload, null, 2);
  await RNFS.writeFile(`${exportDir}/${METADATA_FILENAME}`, json, 'utf8');

  await zip(exportDir, zipPath);

  await removeDirRecursive(exportDir);

  await Share.share({
    url: `file://${zipPath}`,
    title: 'Экспорт данных Voice Inbox AI',
  });
};
