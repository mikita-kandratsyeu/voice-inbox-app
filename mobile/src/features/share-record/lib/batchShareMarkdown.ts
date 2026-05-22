import type { VoiceRecord } from '@/entities/record';
import { formatShortDate, i18n } from '@/shared/lib';

import { buildShareText, type ShareBriefTemplate, shareTemplateFileSuffix } from './buildShareText';
import { resolveShareExportContext, type ShareExportContext } from './shareExportContext';

export function batchMarkdownFileName(record: VoiceRecord, template: ShareBriefTemplate): string {
  const base = record.title.replace(/[^a-zA-Z0-9\u0400-\u04FF\s]/g, '_').trim() || 'note';
  const truncated = base.slice(0, 60);
  return `${truncated}${shareTemplateFileSuffix(template)}-${record.id.slice(0, 8)}.md`;
}

export function buildBatchTableOfContents(
  records: VoiceRecord[],
  options?: { fileNameByRecordId?: Record<string, string> },
): string {
  const locale = i18n.language ?? 'en';
  const lines: string[] = [`## ${i18n.t('share.batchIndexTitle')}`, ''];

  records.forEach((record, index) => {
    const date = record.createdAt ? formatShortDate(record.createdAt, locale) : '';
    const file = options?.fileNameByRecordId?.[record.id];
    const datePart = date ? ` (${date})` : '';
    const filePart = file ? ` — \`${file}\`` : '';
    lines.push(`${index + 1}. **${record.title}**${datePart}${filePart}`);
  });

  return lines.join('\n');
}

export function buildBatchShareMarkdown(
  records: VoiceRecord[],
  template: ShareBriefTemplate,
  context?: ShareExportContext,
): string {
  if (records.length === 0) return '';

  const ctx = resolveShareExportContext(context);
  const toc = buildBatchTableOfContents(records);
  const bodies = records.map((r) => buildShareText(r, template, ctx));
  return [toc, '', bodies.join('\n\n---\n\n')].join('\n');
}
