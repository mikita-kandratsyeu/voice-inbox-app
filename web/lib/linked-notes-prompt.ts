export type AskLinkedNoteForPrompt = {
  title: string;
  summary?: string;
  tasks?: Array<{ text: string }>;
  transcriptExcerpt?: string;
};

export const ASK_LINKED_NOTES_PROMPT_MAX_ITEMS = 10;
export const ASK_LINKED_NOTE_TITLE_MAX_CHARS = 200;
export const ASK_LINKED_NOTE_SUMMARY_MAX_CHARS = 1500;
export const ASK_LINKED_NOTE_TRANSCRIPT_EXCERPT_MAX_CHARS = 2500;
export const ASK_LINKED_NOTE_MAX_TASKS = 10;

export function parseAskLinkedNotes(raw: unknown): AskLinkedNoteForPrompt[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;

  const out: AskLinkedNoteForPrompt[] = [];
  for (const item of raw.slice(0, ASK_LINKED_NOTES_PROMPT_MAX_ITEMS)) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const title = typeof o.title === 'string' ? o.title.replace(/\s+/g, ' ').trim() : '';
    if (!title) continue;

    const summary = typeof o.summary === 'string' ? o.summary.replace(/\s+/g, ' ').trim() : '';
    const trimmedSummary = summary
      ? summary.slice(0, ASK_LINKED_NOTE_SUMMARY_MAX_CHARS)
      : undefined;

    const tasks =
      Array.isArray(o.tasks) &&
      o.tasks
        .map((task) =>
          task && typeof task === 'object' && typeof (task as { text?: unknown }).text === 'string'
            ? (task as { text: string }).text.replace(/\s+/g, ' ').trim()
            : '',
        )
        .filter((text): text is string => Boolean(text))
        .slice(0, ASK_LINKED_NOTE_MAX_TASKS)
        .map((text) => ({ text }));

    const transcriptExcerpt =
      typeof o.transcriptExcerpt === 'string'
        ? o.transcriptExcerpt
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, ASK_LINKED_NOTE_TRANSCRIPT_EXCERPT_MAX_CHARS)
        : undefined;

    if (!trimmedSummary && !transcriptExcerpt && (!tasks || tasks.length === 0)) continue;

    out.push({
      title: title.slice(0, ASK_LINKED_NOTE_TITLE_MAX_CHARS),
      ...(trimmedSummary ? { summary: trimmedSummary } : {}),
      ...(tasks && tasks.length > 0 ? { tasks } : {}),
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
