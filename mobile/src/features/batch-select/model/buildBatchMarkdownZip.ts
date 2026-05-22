import { zip } from 'react-native-zip-archive';

import type { VoiceRecord } from '@/entities/record';
import {
  batchMarkdownFileName,
  buildBatchTableOfContents,
} from '@/features/share-record/lib/batchShareMarkdown';
import {
  buildShareText,
  type ShareBriefTemplate,
} from '@/features/share-record/lib/buildShareText';
import {
  resolveShareExportContext,
  type ShareExportContext,
} from '@/features/share-record/lib/shareExportContext';
import { i18n } from '@/shared/lib';
import { getCachesDirectoryPath, NitroFS } from '@/shared/lib/fs';

export type BuildBatchMarkdownZipResult = {
  zipPath: string;
  exportDir: string;
  zipFileName: string;
};

export async function buildBatchMarkdownZip(
  records: VoiceRecord[],
  template: ShareBriefTemplate,
  context?: ShareExportContext,
): Promise<BuildBatchMarkdownZipResult> {
  const cache = getCachesDirectoryPath();
  const timestamp = Date.now();
  const exportDir = `${cache}/voice-inbox-batch-md-${timestamp}`;
  const zipFileName = `voice-inbox-batch-${timestamp}.zip`;
  const zipPath = `${cache}/${zipFileName}`;

  const ctx = resolveShareExportContext(context);
  const fileNameByRecordId: Record<string, string> = {};

  await NitroFS.mkdir(exportDir);

  for (const record of records) {
    const fileName = batchMarkdownFileName(record, template);
    fileNameByRecordId[record.id] = fileName;
    const text = buildShareText(record, template, ctx);
    await NitroFS.writeFile(`${exportDir}/${fileName}`, text, 'utf8');
  }

  const indexMd = [
    `# ${i18n.t('share.batchIndexTitle')}`,
    '',
    buildBatchTableOfContents(records, { fileNameByRecordId }),
    '',
    `_${i18n.t('share.exportedFrom')}_`,
  ].join('\n');
  await NitroFS.writeFile(`${exportDir}/index.md`, indexMd, 'utf8');

  await zip(exportDir, zipPath);

  return { zipPath, exportDir, zipFileName };
}
