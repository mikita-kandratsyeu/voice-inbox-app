import type { AskLinkedNoteForPrompt } from './types';

export const ASK_LINKED_NOTES_PROMPT_MAX_ITEMS = 10;
export const ASK_LINKED_NOTE_TITLE_MAX_CHARS = 200;
export const ASK_LINKED_NOTE_SUMMARY_MAX_CHARS = 1500;
export const ASK_LINKED_NOTE_TRANSCRIPT_EXCERPT_MAX_CHARS = 2500;
export const ASK_LINKED_NOTE_MAX_TASKS = 10;

export function sanitizeAskLinkedNotesForPrompt(
  notes: AskLinkedNoteForPrompt[] | undefined | null,
): AskLinkedNoteForPrompt[] | undefined {
  if (!notes?.length) return undefined;

  const out: AskLinkedNoteForPrompt[] = [];
  for (const note of notes.slice(0, ASK_LINKED_NOTES_PROMPT_MAX_ITEMS)) {
    if (!note || typeof note !== 'object') continue;
    const title = typeof note.title === 'string' ? note.title.replace(/\s+/g, ' ').trim() : '';
    if (!title) continue;

    const summary =
      typeof note.summary === 'string' ? note.summary.replace(/\s+/g, ' ').trim() : '';
    const trimmedSummary = summary
      ? summary.slice(0, ASK_LINKED_NOTE_SUMMARY_MAX_CHARS)
      : undefined;

    const tasks =
      note.tasks
        ?.map((task) =>
          typeof task?.text === 'string' ? task.text.replace(/\s+/g, ' ').trim() : '',
        )
        .filter((text): text is string => Boolean(text))
        .slice(0, ASK_LINKED_NOTE_MAX_TASKS)
        .map((text) => ({ text })) ?? [];

    const transcriptExcerpt =
      typeof note.transcriptExcerpt === 'string'
        ? note.transcriptExcerpt.replace(/\s+/g, ' ').trim().slice(0, ASK_LINKED_NOTE_TRANSCRIPT_EXCERPT_MAX_CHARS)
        : undefined;

    if (!trimmedSummary && !transcriptExcerpt && tasks.length === 0) continue;

    out.push({
      title: title.slice(0, ASK_LINKED_NOTE_TITLE_MAX_CHARS),
      ...(trimmedSummary ? { summary: trimmedSummary } : {}),
      ...(tasks.length ? { tasks } : {}),
      ...(transcriptExcerpt ? { transcriptExcerpt } : {}),
    });
  }

  return out.length ? out : undefined;
}

export function buildLinkedNotesPromptBlock(notes: AskLinkedNoteForPrompt[]): string {
  const sections = notes.map((note, index) => {
    const lines = [`Linked note ${index + 1}: ${note.title}`];
    if (note.summary) {
      lines.push(`Summary:\n${note.summary}`);
    }
    if (note.tasks?.length) {
      lines.push(`Tasks:\n${note.tasks.map((task) => `- ${task.text}`).join('\n')}`);
    }
    if (note.transcriptExcerpt) {
      lines.push(`Transcript excerpt:\n${note.transcriptExcerpt}`);
    }
    return lines.join('\n');
  });

  return [
    'Linked notes (user-chosen related notes; supplementary context for the main note above):',
    sections.join('\n\n---\n\n'),
  ].join('\n\n');
}
