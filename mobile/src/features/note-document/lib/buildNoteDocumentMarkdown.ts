import type { VoiceRecord } from '@/entities/record';
import { buildShareText, type ShareBriefTemplate } from '@/features/share-record/lib/buildShareText';
import {
  resolveShareExportContext,
  type ShareExportContext,
} from '@/features/share-record/lib/shareExportContext';

export function resolveNoteDocumentTemplate(record: VoiceRecord): ShareBriefTemplate {
  const isMeeting =
    record.classification === 'meeting' || Boolean(record.meetingDialogue?.trim());
  return isMeeting ? 'meetingBrief' : 'noteBrief';
}

export function buildNoteDocumentMarkdown(
  record: VoiceRecord,
  context?: ShareExportContext,
): string {
  const ctx = resolveShareExportContext({ ...context, forDocument: true });
  const template = resolveNoteDocumentTemplate(record);
  return buildShareText(record, template, ctx);
}
