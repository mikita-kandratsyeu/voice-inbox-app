import { ASK_QUESTION_SYSTEM_PROMPT } from '@/lib/prompts';

const ASK_PRIOR_TURNS_MAX = 20;
const ASK_PRIOR_QUESTION_MAX_CHARS = 6000;
const ASK_PRIOR_ANSWER_MAX_CHARS = 16_000;

export function parseAskPriorTurns(
  raw: unknown,
): { question: string; answer: string }[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: { question: string; answer: string }[] = [];
  for (const item of raw.slice(-ASK_PRIOR_TURNS_MAX)) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const q = typeof o.question === 'string' ? o.question.replace(/\s+/g, ' ').trim() : '';
    const a = typeof o.answer === 'string' ? o.answer.replace(/\s+/g, ' ').trim() : '';
    if (!q || !a) continue;
    out.push({
      question: q.slice(0, ASK_PRIOR_QUESTION_MAX_CHARS),
      answer: a.slice(0, ASK_PRIOR_ANSWER_MAX_CHARS),
    });
  }
  return out.length ? out : undefined;
}

function normalizePriorTurnsForAsk(
  turns: { question: string; answer: string }[] | undefined,
): { question: string; answer: string }[] | undefined {
  if (!turns?.length) return undefined;
  const out: { question: string; answer: string }[] = [];
  for (const t of turns.slice(-ASK_PRIOR_TURNS_MAX)) {
    const q = t.question.replace(/\s+/g, ' ').trim();
    const a = t.answer.replace(/\s+/g, ' ').trim();
    if (!q || !a) continue;
    out.push({
      question: q.slice(0, ASK_PRIOR_QUESTION_MAX_CHARS),
      answer: a.slice(0, ASK_PRIOR_ANSWER_MAX_CHARS),
    });
  }
  return out.length ? out : undefined;
}

function formatPriorTurnsForAskPrompt(turns: { question: string; answer: string }[]): string {
  return turns.map((t, i) => `Turn ${i + 1}\nQ: ${t.question}\nA: ${t.answer}`).join('\n\n---\n\n');
}

export function buildAskUserMessageContent(
  transcript: string,
  question: string,
  summary?: string,
  tasks?: { text: string }[],
  priorTurns?: { question: string; answer: string }[],
): string {
  const parts: string[] = ['Transcript:\n\n', transcript];
  if (summary && summary.trim()) {
    parts.push('\n\nSummary:\n\n', summary.trim());
  }
  if (tasks && tasks.length > 0) {
    const taskLines = tasks.map((t) => `- ${t.text}`).join('\n');
    parts.push('\n\nTasks:\n\n', taskLines);
  }
  const normalizedPrior = normalizePriorTurnsForAsk(priorTurns);
  if (normalizedPrior?.length) {
    parts.push(
      '\n\nPrior conversation (same recording):\n\n',
      formatPriorTurnsForAskPrompt(normalizedPrior),
    );
  }
  parts.push('\n\nQuestion: ', question);
  return parts.join('');
}

export function estimateAskRoutingChars(
  transcript: string,
  question: string,
  summary?: string,
  tasks?: { text: string }[],
  priorTurns?: { question: string; answer: string }[],
): number {
  return (
    ASK_QUESTION_SYSTEM_PROMPT.length +
    buildAskUserMessageContent(transcript, question, summary, tasks, priorTurns).length
  );
}
