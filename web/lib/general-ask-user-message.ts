import { GENERAL_ASK_SYSTEM_PROMPT } from '@/lib/prompts';
import { buildAskInterpretationUserHintBlock } from '@/lib/ask-interpretation-hint';

const GENERAL_ASK_PRIOR_TURNS_MAX = 6;
const GENERAL_ASK_PRIOR_QUESTION_MAX_CHARS = 800;
const GENERAL_ASK_PRIOR_ANSWER_MAX_CHARS = 2000;

export function parseGeneralAskPriorTurns(
  raw: unknown,
): { question: string; answer: string }[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: { question: string; answer: string }[] = [];
  for (const item of raw.slice(-GENERAL_ASK_PRIOR_TURNS_MAX)) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const q = typeof o.question === 'string' ? o.question.replace(/\s+/g, ' ').trim() : '';
    const a = typeof o.answer === 'string' ? o.answer.replace(/\s+/g, ' ').trim() : '';
    if (!q || !a) continue;
    out.push({
      question: q.slice(0, GENERAL_ASK_PRIOR_QUESTION_MAX_CHARS),
      answer: a.slice(0, GENERAL_ASK_PRIOR_ANSWER_MAX_CHARS),
    });
  }
  return out.length ? out : undefined;
}

function formatPriorTurnsForGeneralAskPrompt(
  turns: { question: string; answer: string }[],
): string {
  return turns.map((t, i) => `Turn ${i + 1}\nQ: ${t.question}\nA: ${t.answer}`).join('\n\n---\n\n');
}

export function buildGeneralAskUserMessageContent(
  question: string,
  priorTurns?: { question: string; answer: string }[],
): string {
  const parts: string[] = [];

  const normalizedPrior = priorTurns?.length
    ? priorTurns.slice(-GENERAL_ASK_PRIOR_TURNS_MAX)
    : undefined;
  if (normalizedPrior?.length) {
    parts.push('Prior questions and answers in this chat (no note access):\n\n');
    parts.push(formatPriorTurnsForGeneralAskPrompt(normalizedPrior));
  }

  parts.push('\n\nQuestion: ', question.trim());
  const interpretationHint = buildAskInterpretationUserHintBlock(question);
  if (interpretationHint) {
    parts.push('\n\n', interpretationHint);
  }

  return parts.join('');
}

export function estimateGeneralAskRoutingChars(
  question: string,
  priorTurns?: { question: string; answer: string }[],
): number {
  return (
    GENERAL_ASK_SYSTEM_PROMPT.length +
    buildGeneralAskUserMessageContent(question, priorTurns).length
  );
}
