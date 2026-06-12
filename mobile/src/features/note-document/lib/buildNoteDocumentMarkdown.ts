import type { VoiceRecord } from '@/entities/record';
import {
  buildShareText,
  type ShareBriefTemplate,
} from '@/features/share-record/lib/buildShareText';
import {
  resolveShareExportContext,
  type ShareExportContext,
} from '@/features/share-record/lib/shareExportContext';

import { resolveNoteDocumentTemplate } from './noteDocumentTemplate';

export { resolveNoteDocumentTemplate } from './noteDocumentTemplate';

export function buildNoteDocumentMarkdown(
  record: VoiceRecord,
  context?: ShareExportContext,
): string {
  const ctx = resolveShareExportContext({ ...context, forDocument: true });
  const template = resolveNoteDocumentTemplate(record);
  return buildShareText(record, template, ctx);
}
