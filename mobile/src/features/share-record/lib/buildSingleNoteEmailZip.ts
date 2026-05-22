import { zip } from 'react-native-zip-archive';

import type { VoiceRecord } from '@/entities/record';
import { getCachesDirectoryPath, NitroFS } from '@/shared/lib/fs';

import { batchMarkdownFileName } from './batchShareMarkdown';
import { buildShareText, type ShareBriefTemplate } from './buildShareText';
import type { ShareExportContext } from './shareExportContext';

export type SingleNoteEmailZipResult = {
  zipPath: string;
  exportDir: string;
  zipFileName: string;
};

export async function buildSingleNoteEmailZip(
  record: VoiceRecord,
  template: ShareBriefTemplate,
  context?: ShareExportContext,
): Promise<SingleNoteEmailZipResult> {
  const cache = getCachesDirectoryPath();
  const timestamp = Date.now();
  const exportDir = `${cache}/voice-inbox-email-zip-${timestamp}`;
  const zipFileName = `voice-inbox-note-${timestamp}.zip`;
  const zipPath = `${cache}/${zipFileName}`;

  await NitroFS.mkdir(exportDir);

  const markdown = buildShareText(record, template, context);
  const fileName = batchMarkdownFileName(record, template);
  await NitroFS.writeFile(`${exportDir}/${fileName}`, markdown, 'utf8');

  await zip(exportDir, zipPath);

  return { zipPath, exportDir, zipFileName };
}
