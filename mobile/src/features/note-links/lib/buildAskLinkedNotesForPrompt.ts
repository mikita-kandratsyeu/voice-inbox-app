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

const WHITESPACE_REGEX = /\s+/g;

function normalizeText(text: string | null | undefined): string {
  return text?.replace(WHITESPACE_REGEX, ' ').trim() ?? '';
}

function extractTasks(tasks: LinkedNoteSource['tasks'], maxTasks: number): Array<{ text: string }> {
  if (!tasks?.length) return [];

  const result: Array<{ text: string }> = [];
  for (let i = 0; i < tasks.length && result.length < maxTasks; i++) {
    const text = normalizeText(tasks[i]?.text);
    if (text) {
      result.push({ text });
    }
  }
  return result;
}

function buildTranscriptExcerpt(
  transcript: string | null | undefined,
  maxChars: number,
): string | undefined {
  const normalized = normalizeText(transcript);
  if (!normalized) return undefined;

  if (normalized.length <= maxChars) return normalized;

  return normalized.slice(0, maxChars) + '…';
}

export function buildAskLinkedNotesForPrompt(
  source: Pick<VoiceRecord, 'id' | 'linkedRecordIds'>,
  recordsById: Map<string, LinkedNoteSource>,
): AskLinkedNoteForPrompt[] | undefined {
  const ids = source.linkedRecordIds;
  if (!ids?.length) return undefined;

  const out: AskLinkedNoteForPrompt[] = [];

  for (const id of ids) {
    if (id === source.id) continue;

    const record = recordsById.get(id);
    if (!record) continue;

    const title = normalizeText(record.title);
    if (!title) continue;

    const summary = normalizeText(record.summary);
    const trimmedSummary = summary
      ? summary.slice(0, ASK_LINKED_NOTE_SUMMARY_MAX_CHARS)
      : undefined;

    const tasks = extractTasks(record.tasks, ASK_LINKED_NOTE_MAX_TASKS);

    const transcriptExcerpt = !trimmedSummary
      ? buildTranscriptExcerpt(record.transcript, ASK_LINKED_NOTE_TRANSCRIPT_EXCERPT_MAX_CHARS)
      : undefined;

    if (!trimmedSummary && !transcriptExcerpt && tasks.length === 0) continue;

    const noteItem: AskLinkedNoteForPrompt = {
      title: title.slice(0, ASK_LINKED_NOTE_TITLE_MAX_CHARS),
    };

    if (trimmedSummary) noteItem.summary = trimmedSummary;
    if (tasks.length > 0) noteItem.tasks = tasks;
    if (transcriptExcerpt) noteItem.transcriptExcerpt = transcriptExcerpt;

    out.push(noteItem);

    if (out.length >= ASK_LINKED_NOTES_PROMPT_MAX_ITEMS) break;
  }

  return out.length > 0 ? out : undefined;
}
