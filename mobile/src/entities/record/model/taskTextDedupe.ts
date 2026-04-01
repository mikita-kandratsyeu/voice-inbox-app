import type { TaskItem } from './types';

const isManualTask = (t: TaskItem) => t.source === 'manual' || t.id.includes('-manual-');

export const normalizeTaskTextForDedupe = (text: string): string => text.trim().toLowerCase();

export const buildNormalizedTextSet = (texts: Iterable<string>): Set<string> => {
  const s = new Set<string>();

  for (const t of texts) {
    const n = normalizeTaskTextForDedupe(t);
    if (n) s.add(n);
  }

  return s;
};

const MAX_PROMPT_TASKS = 40;
const MAX_TASK_CHARS = 400;

export const collectExistingTaskTextsForAiPrompt = (tasks: TaskItem[] | undefined): string[] => {
  if (!tasks?.length) return [];

  const seen = new Set<string>();
  const out: string[] = [];

  for (const t of tasks) {
    const raw = t.text?.trim();

    if (!raw) continue;

    const clipped = raw.length > MAX_TASK_CHARS ? `${raw.slice(0, MAX_TASK_CHARS)}…` : raw;
    const n = normalizeTaskTextForDedupe(clipped);

    if (!n || seen.has(n)) continue;

    seen.add(n);
    out.push(clipped);

    if (out.length >= MAX_PROMPT_TASKS) break;
  }

  return out;
};

export const normalizedManualTaskTextSet = (tasks: TaskItem[] | undefined): Set<string> => {
  const manual = (tasks ?? []).filter(isManualTask).map((t) => t.text);

  return buildNormalizedTextSet(manual);
};

export const filterAiTaskItemsByNormalizedSet = (
  aiTasks: TaskItem[],
  blocklist: Set<string>,
): TaskItem[] => aiTasks.filter((t) => !blocklist.has(normalizeTaskTextForDedupe(t.text)));

export const filterNextStepsByNormalizedTaskSet = (
  nextSteps: string[],
  taskTextsNormalized: Set<string>,
): string[] =>
  nextSteps.filter((step) => !taskTextsNormalized.has(normalizeTaskTextForDedupe(step)));
