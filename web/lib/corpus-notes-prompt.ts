/** Keep in sync with `mobile/src/shared/lib/ai-core/corpusNotesForPrompt.ts`. */

export type CorpusNoteForPrompt = {
  recordId: string;
  title: string;
  summary?: string;
  keyPhrases?: string[];
  tasks?: Array<{ text: string }>;
  transcriptExcerpt?: string;
  createdAt?: string;
};

export const INBOX_ASK_MAX_NOTES = 8;
export const INBOX_ASK_MAX_PAYLOAD_CHARS = 12_000;
export const NOTE_TITLE_MAX = 160;
export const NOTE_SUMMARY_MAX = 360;
export const NOTE_KEY_PHRASES_MAX = 6;
export const NOTE_TASKS_MAX = 5;
export const NOTE_TASK_TEXT_MAX = 72;
export const TRANSCRIPT_EXCERPT_MAX = 280;

const TRANSCRIPT_EXCERPT_GAP = '\n…\n';

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function smartTranscriptExcerpt(text: string, maxChars: number): string | undefined {
  const normalized = normalizeText(text);
  if (!normalized) return undefined;
  if (normalized.length <= maxChars) return normalized;
  if (maxChars <= TRANSCRIPT_EXCERPT_GAP.length + 2) return normalized.slice(0, maxChars);

  const budget = maxChars - TRANSCRIPT_EXCERPT_GAP.length;
  const headLen = Math.ceil(budget / 2);
  const tailLen = Math.floor(budget / 2);
  return `${normalized.slice(0, headLen)}${TRANSCRIPT_EXCERPT_GAP}${normalized.slice(-tailLen)}`;
}

export function parseCorpusNotes(raw: unknown): CorpusNoteForPrompt[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;

  const out: CorpusNoteForPrompt[] = [];
  for (const item of raw.slice(0, INBOX_ASK_MAX_NOTES)) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;

    const recordId = typeof o.recordId === 'string' ? o.recordId.trim() : '';
    const title = typeof o.title === 'string' ? normalizeText(o.title) : '';
    if (!recordId || !title) continue;

    const summary =
      typeof o.summary === 'string'
        ? normalizeText(o.summary).slice(0, NOTE_SUMMARY_MAX)
        : undefined;

    const keyPhrasesList = Array.isArray(o.keyPhrases)
      ? o.keyPhrases
          .map((phrase) => (typeof phrase === 'string' ? normalizeText(phrase) : ''))
          .filter((phrase): phrase is string => Boolean(phrase))
          .slice(0, NOTE_KEY_PHRASES_MAX)
      : [];

    const tasks =
      Array.isArray(o.tasks) &&
      o.tasks
        .map((task) =>
          task && typeof task === 'object' && typeof (task as { text?: unknown }).text === 'string'
            ? normalizeText((task as { text: string }).text).slice(0, NOTE_TASK_TEXT_MAX)
            : '',
        )
        .filter((text): text is string => Boolean(text))
        .slice(0, NOTE_TASKS_MAX)
        .map((text) => ({ text }));

    const transcriptExcerpt =
      typeof o.transcriptExcerpt === 'string'
        ? smartTranscriptExcerpt(o.transcriptExcerpt, TRANSCRIPT_EXCERPT_MAX)
        : undefined;

    if (
      !summary &&
      !transcriptExcerpt &&
      (!tasks || tasks.length === 0) &&
      keyPhrasesList.length === 0
    ) {
      continue;
    }

    out.push({
      recordId,
      title: title.slice(0, NOTE_TITLE_MAX),
      ...(summary ? { summary } : {}),
      ...(keyPhrasesList.length > 0 ? { keyPhrases: keyPhrasesList } : {}),
      ...(tasks && tasks.length > 0 ? { tasks } : {}),
      ...(transcriptExcerpt ? { transcriptExcerpt } : {}),
      ...(typeof o.createdAt === 'string' && o.createdAt.trim()
        ? { createdAt: o.createdAt.trim() }
        : {}),
    });
  }

  return out.length ? out : undefined;
}

export function buildCorpusNotesPromptBlock(notes: CorpusNoteForPrompt[]): string {
  const sections = notes.map((note, index) => {
    const lines = [`Note ${index + 1}: ${note.title}`];
    if (note.createdAt) {
      lines.push(`Created: ${note.createdAt}`);
    }
    if (note.summary) {
      lines.push(`Summary:\n${note.summary}`);
    }
    if (note.keyPhrases?.length) {
      lines.push(`Key phrases:\n${note.keyPhrases.map((phrase) => `- ${phrase}`).join('\n')}`);
    }
    if (note.tasks?.length) {
      lines.push(`Open tasks:\n${note.tasks.map((task) => `- ${task.text}`).join('\n')}`);
    }
    if (note.transcriptExcerpt) {
      lines.push(`Transcript excerpt:\n${note.transcriptExcerpt}`);
    }
    return lines.join('\n');
  });

  return [
    'Inbox notes (compact context selected from the user inbox; answer using only these notes):',
    sections.join('\n\n---\n\n'),
  ].join('\n\n');
}

export function estimateCorpusNotesPayloadChars(notes: CorpusNoteForPrompt[]): number {
  return notes.reduce((sum, note) => sum + JSON.stringify(note).length, 0);
}
