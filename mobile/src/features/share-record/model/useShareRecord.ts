import { Share } from 'react-native';
import RNFS from 'react-native-fs';

import type { VoiceRecord } from '@/entities/record';

const buildShareText = (record: VoiceRecord): string => {
  const lines: string[] = [];

  lines.push(`# ${record.title}`);
  lines.push(`Date: ${record.createdAt}`);
  lines.push(`Duration: ${record.duration}`);

  if (record.transcript) {
    lines.push('');
    lines.push('## Transcript');
    lines.push(record.transcript);
  }

  if (record.summary) {
    lines.push('');
    lines.push('## Summary');
    lines.push(record.summary);
  }

  if (record.tasks && record.tasks.length > 0) {
    lines.push('');
    lines.push('## Tasks');
    record.tasks.forEach((t) => {
      lines.push(`- [${t.isDone ? 'x' : ' '}] ${t.text}`);
    });
  }

  return lines.join('\n');
};

export const useShareRecord = () => {
  const shareRecord = async (record: VoiceRecord) => {
    const text = buildShareText(record);
    const fileName = `${record.title.replace(/[^a-zA-Z0-9\u0400-\u04FF\s]/g, '_')}.txt`;
    const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;

    try {
      await RNFS.writeFile(filePath, text, 'utf8');

      await Share.share(
        {
          title: record.title,
          message: text,
          url: `file://${filePath}`,
        },
        { dialogTitle: 'Share note' },
      );
    } catch (err) {
      const error = err as Error;
      if (error.message !== 'User did not share') {
        throw error;
      }
    }
  };

  return { shareRecord };
};
