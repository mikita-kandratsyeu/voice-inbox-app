import { Share } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import FS from '@/shared/lib/fs/fsAdapter';

type ExportPayload = {
  version: 1;
  exportedAt: string;
  records: Omit<VoiceRecord, 'audioPath'>[];
};

export const exportData = async (records: VoiceRecord[]): Promise<void> => {
  const payload: ExportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    records: records.map(({ audioPath: _audio, ...rest }) => rest),
  };

  const json = JSON.stringify(payload, null, 2);
  const fileName = `voice-inbox-backup-${Date.now()}.json`;
  const filePath = `${FS.CACHE_DIR}/${fileName}`;

  await FS.writeFile(filePath, json, 'utf8');

  await Share.share({
    url: `file://${filePath}`,
    title: 'Экспорт данных Voice Inbox',
  });
};
