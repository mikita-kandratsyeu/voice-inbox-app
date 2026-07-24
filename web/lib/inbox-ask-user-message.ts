import { INBOX_ASK_SYSTEM_PROMPT } from '@/lib/prompts';
import { buildCorpusNotesPromptBlock, type CorpusNoteForPrompt } from '@/lib/corpus-notes-prompt';
import { buildAskInterpretationUserHintBlock } from '@/lib/ask-interpretation-hint';

const INBOX_ASK_PRIOR_TURNS_MAX = 6;
const INBOX_ASK_PRIOR_QUESTION_MAX_CHARS = 800;
const INBOX_ASK_PRIOR_ANSWER_MAX_CHARS = 2000;

export function parseInboxAskPriorTurns(
  raw: unknown,
): { question: string; answer: string }[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: { question: string; answer: string }[] = [];
  for (const item of raw.slice(-INBOX_ASK_PRIOR_TURNS_MAX)) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const q = typeof o.question === 'string' ? o.question.replace(/\s+/g, ' ').trim() : '';
    const a = typeof o.answer === 'string' ? o.answer.replace(/\s+/g, ' ').trim() : '';
    if (!q || !a) continue;
    out.push({
      question: q.slice(0, INBOX_ASK_PRIOR_QUESTION_MAX_CHARS),
      answer: a.slice(0, INBOX_ASK_PRIOR_ANSWER_MAX_CHARS),
    });
  }
  return out.length ? out : undefined;
}

function formatPriorTurnsForInboxAskPrompt(turns: { question: string; answer: string }[]): string {
  return turns.map((t, i) => `Turn ${i + 1}\nQ: ${t.question}\nA: ${t.answer}`).join('\n\n---\n\n');
}

export function buildInboxAskUserMessageContent(
  corpusNotes: CorpusNoteForPrompt[],
  question: string,
  priorTurns?: { question: string; answer: string }[],
): string {
  const parts: string[] = [buildCorpusNotesPromptBlock(corpusNotes)];

  const normalizedPrior = priorTurns?.length
    ? priorTurns.slice(-INBOX_ASK_PRIOR_TURNS_MAX)
    : undefined;
  if (normalizedPrior?.length) {
    parts.push('\n\nPrior questions and answers in this inbox chat:\n\n');
    parts.push(formatPriorTurnsForInboxAskPrompt(normalizedPrior));
  }

  parts.push('\n\nQuestion: ', question.trim());
  const interpretationHint = buildAskInterpretationUserHintBlock(question);
  if (interpretationHint) {
    parts.push('\n\n', interpretationHint);
  }

  return parts.join('');
}

export function estimateInboxAskRoutingChars(
  corpusNotes: CorpusNoteForPrompt[],
  question: string,
  priorTurns?: { question: string; answer: string }[],
): number {
  return (
    INBOX_ASK_SYSTEM_PROMPT.length +
    buildInboxAskUserMessageContent(corpusNotes, question, priorTurns).length
  );
}
