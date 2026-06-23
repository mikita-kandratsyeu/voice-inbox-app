import type { CorpusNoteForPrompt } from './types';

/** Keep in sync with `web/lib/corpus-notes-prompt.ts`. */
export const INBOX_ASK_MAX_NOTES = 8;
export const INBOX_ASK_MAX_PAYLOAD_CHARS = 12_000;
export const NOTE_TITLE_MAX = 160;
export const NOTE_SUMMARY_MAX = 360;
export const NOTE_SUMMARY_COMPRESSED_MAX = 200;
export const NOTE_KEY_PHRASES_MAX = 6;
export const NOTE_TASKS_MAX = 5;
export const NOTE_TASK_TEXT_MAX = 72;
export const TRANSCRIPT_EXCERPT_MAX = 280;

const TRANSCRIPT_EXCERPT_GAP = '\n…\n';
const WHITESPACE_REGEX = /\s+/g;

export type CorpusNoteCandidate = {
  recordId: string;
  score: number;
  title: string;
  summary?: string | null;
  keyPhrases?: string[] | null;
  tasks?: Array<{ text: string; isDone?: boolean }> | null;
  transcript?: string | null;
  createdAt?: string | null;
};

export type PackCorpusNotesResult = {
  notes: CorpusNoteForPrompt[];
  totalChars: number;
  droppedCount: number;
};

function normalizeText(text: string | null | undefined): string {
  return text?.replace(WHITESPACE_REGEX, ' ').trim() ?? '';
}

export function smartTranscriptExcerpt(
  text: string | null | undefined,
  maxChars: number,
): string | undefined {
  const normalized = normalizeText(text);
  if (!normalized) return undefined;
  if (normalized.length <= maxChars) return normalized;
  if (maxChars <= TRANSCRIPT_EXCERPT_GAP.length + 2) {
    return normalized.slice(0, maxChars);
  }

  const budget = maxChars - TRANSCRIPT_EXCERPT_GAP.length;
  const headLen = Math.ceil(budget / 2);
  const tailLen = Math.floor(budget / 2);
  return `${normalized.slice(0, headLen)}${TRANSCRIPT_EXCERPT_GAP}${normalized.slice(-tailLen)}`;
}

function extractOpenTasks(
  tasks: CorpusNoteCandidate['tasks'],
  maxTasks: number,
): Array<{ text: string }> {
  if (!tasks?.length) return [];

  const out: Array<{ text: string }> = [];
  for (const task of tasks) {
    if (task.isDone) continue;
    const text = normalizeText(task.text).slice(0, NOTE_TASK_TEXT_MAX);
    if (!text) continue;
    out.push({ text });
    if (out.length >= maxTasks) break;
  }
  return out;
}

function estimateNotePayloadChars(note: CorpusNoteForPrompt): number {
  return JSON.stringify(note).length;
}

function buildCorpusNoteFromCandidate(
  candidate: CorpusNoteCandidate,
  options: {
    summaryMaxChars: number;
    includeTranscriptExcerpt: boolean;
  },
): CorpusNoteForPrompt | null {
  const title = normalizeText(candidate.title).slice(0, NOTE_TITLE_MAX);
  if (!title) return null;

  const summaryRaw = normalizeText(candidate.summary);
  const summary = summaryRaw ? summaryRaw.slice(0, options.summaryMaxChars) : undefined;

  const keyPhrases = candidate.keyPhrases
    ?.map((phrase) => normalizeText(phrase))
    .filter(Boolean)
    .slice(0, NOTE_KEY_PHRASES_MAX);

  const tasks = extractOpenTasks(candidate.tasks, NOTE_TASKS_MAX);

  const transcriptExcerpt =
    options.includeTranscriptExcerpt && !summary
      ? smartTranscriptExcerpt(candidate.transcript, TRANSCRIPT_EXCERPT_MAX)
      : undefined;

  if (!summary && !transcriptExcerpt && tasks.length === 0 && !keyPhrases?.length) {
    return null;
  }

  const note: CorpusNoteForPrompt = {
    recordId: candidate.recordId,
    title,
  };

  if (summary) note.summary = summary;
  if (keyPhrases?.length) note.keyPhrases = keyPhrases;
  if (tasks.length) note.tasks = tasks;
  if (transcriptExcerpt) note.transcriptExcerpt = transcriptExcerpt;
  if (candidate.createdAt) note.createdAt = candidate.createdAt;

  return note;
}

export function packCorpusNotesForPrompt(
  candidates: readonly CorpusNoteCandidate[],
  options?: { maxNotes?: number; maxPayloadChars?: number },
): PackCorpusNotesResult {
  const maxNotes = options?.maxNotes ?? INBOX_ASK_MAX_NOTES;
  const maxPayloadChars = options?.maxPayloadChars ?? INBOX_ASK_MAX_PAYLOAD_CHARS;

  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  let pool = sorted.slice(0, maxNotes);
  let droppedCount = Math.max(0, sorted.length - pool.length);
  let summaryMax = NOTE_SUMMARY_MAX;

  while (pool.length > 0) {
    const notes: CorpusNoteForPrompt[] = [];

    for (let index = 0; index < pool.length; index += 1) {
      const candidate = pool[index];
      const includeTranscriptExcerpt = index < 2 && !normalizeText(candidate.summary);
      const note = buildCorpusNoteFromCandidate(candidate, {
        summaryMaxChars: summaryMax,
        includeTranscriptExcerpt,
      });
      if (note) notes.push(note);
    }

    const totalChars = notes.reduce((sum, note) => sum + estimateNotePayloadChars(note), 0);
    if (totalChars <= maxPayloadChars) {
      return { notes, totalChars, droppedCount };
    }

    if (summaryMax > NOTE_SUMMARY_COMPRESSED_MAX) {
      summaryMax = NOTE_SUMMARY_COMPRESSED_MAX;
      continue;
    }

    if (pool.length <= 1) {
      const lone = notes[0];
      if (!lone) {
        return { notes: [], totalChars: 0, droppedCount };
      }

      if (lone.summary && lone.summary.length > NOTE_SUMMARY_COMPRESSED_MAX) {
        lone.summary = lone.summary.slice(0, NOTE_SUMMARY_COMPRESSED_MAX);
      }
      if (lone.transcriptExcerpt && lone.transcriptExcerpt.length > TRANSCRIPT_EXCERPT_MAX) {
        lone.transcriptExcerpt = smartTranscriptExcerpt(lone.transcriptExcerpt, TRANSCRIPT_EXCERPT_MAX);
      }

      return {
        notes: [lone],
        totalChars: estimateNotePayloadChars(lone),
        droppedCount,
      };
    }

    pool = pool.slice(0, -1);
    droppedCount += 1;
  }

  return { notes: [], totalChars: 0, droppedCount };
}

export function sanitizeCorpusNotesForPrompt(
  notes: CorpusNoteForPrompt[] | undefined | null,
): CorpusNoteForPrompt[] | undefined {
  if (!notes?.length) return undefined;

  const out: CorpusNoteForPrompt[] = [];
  for (const note of notes.slice(0, INBOX_ASK_MAX_NOTES)) {
    if (!note || typeof note !== 'object') continue;
    const recordId = typeof note.recordId === 'string' ? note.recordId.trim() : '';
    const title = typeof note.title === 'string' ? normalizeText(note.title) : '';
    if (!recordId || !title) continue;

    const summary =
      typeof note.summary === 'string' ? normalizeText(note.summary).slice(0, NOTE_SUMMARY_MAX) : undefined;

    const keyPhrases = note.keyPhrases
      ?.map((phrase) => (typeof phrase === 'string' ? normalizeText(phrase) : ''))
      .filter(Boolean)
      .slice(0, NOTE_KEY_PHRASES_MAX);

    const tasks =
      note.tasks
        ?.map((task) =>
          typeof task?.text === 'string' ? normalizeText(task.text).slice(0, NOTE_TASK_TEXT_MAX) : '',
        )
        .filter((text): text is string => Boolean(text))
        .slice(0, NOTE_TASKS_MAX)
        .map((text) => ({ text })) ?? [];

    const transcriptExcerpt =
      typeof note.transcriptExcerpt === 'string'
        ? smartTranscriptExcerpt(note.transcriptExcerpt, TRANSCRIPT_EXCERPT_MAX)
        : undefined;

    if (!summary && !transcriptExcerpt && tasks.length === 0 && !keyPhrases?.length) continue;

    out.push({
      recordId,
      title: title.slice(0, NOTE_TITLE_MAX),
      ...(summary ? { summary } : {}),
      ...(keyPhrases?.length ? { keyPhrases } : {}),
      ...(tasks.length ? { tasks } : {}),
      ...(transcriptExcerpt ? { transcriptExcerpt } : {}),
      ...(typeof note.createdAt === 'string' && note.createdAt.trim()
        ? { createdAt: note.createdAt.trim() }
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
  return notes.reduce((sum, note) => sum + estimateNotePayloadChars(note), 0);
}
