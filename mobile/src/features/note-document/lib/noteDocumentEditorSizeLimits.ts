import type { VoiceRecord } from '@/entities/record';

/** Below this length, enriched markdown editing feels responsive on most devices. */
export const NOTE_DOCUMENT_EDITOR_COMFORTABLE_MAX_CHARS = 4_000;

/** Rough overhead for section markers, headers, and metadata in exported markdown. */
const NOTE_DOCUMENT_EDITOR_EXPORT_OVERHEAD_CHARS = 900;

export function shouldWarnNoteDocumentEditorSize(markdownLength: number): boolean {
  return markdownLength > NOTE_DOCUMENT_EDITOR_COMFORTABLE_MAX_CHARS;
}

export function estimateNoteDocumentCharacterCount(
  record: Pick<
    VoiceRecord,
    | 'title'
    | 'summary'
    | 'transcript'
    | 'translatedTranscript'
    | 'meetingDialogue'
    | 'tags'
    | 'keyPhrases'
    | 'nextSteps'
    | 'tasks'
  >,
): number {
  let total = (record.title?.length ?? 0) + (record.transcript?.length ?? 0);
  total += record.summary?.length ?? 0;
  total += record.translatedTranscript?.length ?? 0;
  total += record.meetingDialogue?.length ?? 0;
  total += record.tags?.join(', ').length ?? 0;
  total += record.keyPhrases?.join(', ').length ?? 0;
  total += record.nextSteps?.join('\n').length ?? 0;
  total += record.tasks?.reduce((sum, task) => sum + task.text.length, 0) ?? 0;
  return total + NOTE_DOCUMENT_EDITOR_EXPORT_OVERHEAD_CHARS;
}
