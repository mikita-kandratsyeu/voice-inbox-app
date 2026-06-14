import type { RecordListItem, VoiceRecord } from '@/entities/record';
import {
  ASK_LINKED_NOTE_MAX_TASKS,
  ASK_LINKED_NOTE_SUMMARY_MAX_CHARS,
  ASK_LINKED_NOTE_TITLE_MAX_CHARS,
  ASK_LINKED_NOTE_TRANSCRIPT_EXCERPT_MAX_CHARS,
  ASK_LINKED_NOTES_PROMPT_MAX_ITEMS,
} from '@/shared/lib/ai-core/linkedNotesForPrompt';
import type { AskLinkedNoteForPrompt } from '@/shared/lib/ai-core/types';

type LinkedNoteSource = Pick<
  VoiceRecord | RecordListItem,
  'id' | 'title' | 'summary' | 'transcript' | 'tasks'
>;

export function buildAskLinkedNotesForPrompt(
  source: Pick<VoiceRecord, 'id' | 'linkedRecordIds'>,
  recordsById: Map<string, LinkedNoteSource>,
): AskLinkedNoteForPrompt[] | undefined {
  const ids = source.linkedRecordIds ?? [];
  if (!ids.length) return undefined;

  const out: AskLinkedNoteForPrompt[] = [];

  for (const id of ids) {
    if (id === source.id) continue;
    const record = recordsById.get(id);
    if (!record) continue;

    const title = record.title?.replace(/\s+/g, ' ').trim();
    if (!title) continue;

    const summary = record.summary?.replace(/\s+/g, ' ').trim();
    const trimmedSummary = summary
      ? summary.slice(0, ASK_LINKED_NOTE_SUMMARY_MAX_CHARS)
      : undefined;

    const tasks =
      record.tasks
        ?.map((task) => task.text?.replace(/\s+/g, ' ').trim())
        .filter((text): text is string => Boolean(text))
        .slice(0, ASK_LINKED_NOTE_MAX_TASKS)
        .map((text) => ({ text })) ?? [];

    let transcriptExcerpt: string | undefined;
    if (!trimmedSummary) {
      const transcript = record.transcript?.replace(/\s+/g, ' ').trim();
      if (transcript) {
        transcriptExcerpt = transcript.slice(0, ASK_LINKED_NOTE_TRANSCRIPT_EXCERPT_MAX_CHARS);
        if (transcript.length > ASK_LINKED_NOTE_TRANSCRIPT_EXCERPT_MAX_CHARS) {
          transcriptExcerpt += '…';
        }
      }
    }

    if (!trimmedSummary && !transcriptExcerpt && tasks.length === 0) continue;

    out.push({
      title: title.slice(0, ASK_LINKED_NOTE_TITLE_MAX_CHARS),
      ...(trimmedSummary ? { summary: trimmedSummary } : {}),
      ...(tasks.length ? { tasks } : {}),
      ...(transcriptExcerpt ? { transcriptExcerpt } : {}),
    });

    if (out.length >= ASK_LINKED_NOTES_PROMPT_MAX_ITEMS) break;
  }

  return out.length ? out : undefined;
}
