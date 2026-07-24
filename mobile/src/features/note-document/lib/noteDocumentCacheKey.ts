import type { VoiceRecord } from '@/entities/record';
import type { ShareExportContext } from '@/features/share-record/lib/shareExportContext';

import { resolveNoteDocumentTemplate } from './noteDocumentTemplate';

function hashStringFNV(str: string): string {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function fingerprintText(text: string | null | undefined): string {
  if (!text) return '0';
  return `${text.length}:${hashStringFNV(text)}`;
}

function fingerprintList(items: readonly string[] | null | undefined): string {
  if (!items?.length) return '0';
  return `${items.length}:${hashStringFNV(items.join('\u001f'))}`;
}

function fingerprintTasks(tasks: VoiceRecord['tasks']): string {
  if (!tasks?.length) return '0';
  const payload = tasks
    .map(
      (t) =>
        `${t.id}|${t.isDone ? 1 : 0}|${t.text.length}|${t.text}|${fingerprintText(t.outcomeText)}|${t.outcomeRecordId ?? ''}`,
    )
    .join('\u001e');
  return `${tasks.length}:${hashStringFNV(payload)}`;
}

function folderNameFor(record: VoiceRecord, ctx: ShareExportContext): string {
  const id = record.folderId;
  if (!id) return '';
  return ctx.folderNameById?.[id] ?? '';
}

export function buildNoteDocumentCacheKey(
  record: VoiceRecord,
  language: string,
  context: ShareExportContext,
): string {
  const template = resolveNoteDocumentTemplate(record);
  const segmentCount = record.transcriptSegments?.length ?? 0;

  return [
    record.id,
    language,
    template,
    record.folderId ?? '',
    folderNameFor(record, context),
    record.classification ?? '',
    fingerprintText(record.title),
    fingerprintText(record.summary),
    fingerprintText(record.transcript),
    fingerprintText(record.translatedTranscript),
    fingerprintText(record.meetingDialogue),
    fingerprintText(record.translationLanguage),
    fingerprintList(record.tags),
    fingerprintList(record.keyPhrases),
    fingerprintList(record.nextSteps),
    fingerprintTasks(record.tasks),
    String(segmentCount),
    segmentCount > 0
      ? hashStringFNV(
          record.transcriptSegments!.map((s) => `${s.startTime}|${s.text}`).join('\u001e'),
        )
      : '0',
    hashStringFNV(JSON.stringify(record.meetingSpeakerLabels ?? {})),
    hashStringFNV(JSON.stringify(record.recordingMarks ?? [])),
  ].join(':');
}
