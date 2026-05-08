import { zip } from 'react-native-zip-archive';

import type { VoiceRecord } from '@/entities/record';
import {
  buildShareText,
  RECORD_TEXT_EXPORT_EXTENSION,
  type ShareBriefTemplate,
} from '@/features/share-record';
import { getCachesDirectoryPath, NitroFS } from '@/shared/lib/fs';

const sanitizeTitleForFileName = (title: string): string =>
  title.replace(/[^a-zA-Z0-9\u0400-\u04FF\s]/g, '_');

export type BuildBatchMarkdownZipResult = {
  zipPath: string;
  exportDir: string;
  zipFileName: string;
};

export async function buildBatchMarkdownZip(
  records: VoiceRecord[],
  template: ShareBriefTemplate,
): Promise<BuildBatchMarkdownZipResult> {
  const cache = getCachesDirectoryPath();
  const timestamp = Date.now();
  const templateSuffix = template === 'meetingBrief' ? '-meeting-brief' : '-note-brief';
  const exportDir = `${cache}/voice-inbox-batch-md-${timestamp}`;
  const zipFileName = `voice-inbox-batch-${timestamp}.zip`;
  const zipPath = `${cache}/${zipFileName}`;

  await NitroFS.mkdir(exportDir);

  for (const record of records) {
    const text = buildShareText(record, template);
    const base = sanitizeTitleForFileName(record.title).trim() || 'note';
    const truncated = base.slice(0, 60);
    const fileName = `${truncated}${templateSuffix}-${record.id.slice(0, 8)}.${RECORD_TEXT_EXPORT_EXTENSION}`;
    await NitroFS.writeFile(`${exportDir}/${fileName}`, text, 'utf8');
  }

  await zip(exportDir, zipPath);

  return { zipPath, exportDir, zipFileName };
}
