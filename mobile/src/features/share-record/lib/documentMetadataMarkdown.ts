import type { VoiceRecord } from '@/entities/record';
import { formatShortDate, i18n } from '@/shared/lib';

import type { ShareExportContext } from './shareExportContext';

function folderNameFor(record: VoiceRecord, ctx: ShareExportContext): string | null {
  const id = record.folderId;
  if (!id) return null;
  return ctx.folderNameById?.[id] ?? null;
}

export function buildDocumentMetadataMarkdownLines(
  record: VoiceRecord,
  ctx: ShareExportContext,
): string[] {
  const locale = i18n.language ?? 'en';
  const lines: string[] = [];
  const dateValue = record.createdAt ? formatShortDate(record.createdAt, locale) : record.createdAt;

  lines.push(`**${i18n.t('share.dateLabel')}:** ${dateValue}`);
  lines.push(`**${i18n.t('share.durationLabel')}:** ${record.duration}`);

  const folder = folderNameFor(record, ctx);
  if (folder) {
    lines.push(`**${i18n.t('share.folderLabel')}:** ${folder}`);
  }

  if (record.classification) {
    lines.push(
      `**${i18n.t('share.classificationLabel')}:** ${i18n.t(`classification.${record.classification}`)}`,
    );
  }

  if (!ctx.forDocument) {
    lines.push(`**${i18n.t('share.recordIdLabel')}:** \`${record.id}\``);
  }

  return lines;
}
