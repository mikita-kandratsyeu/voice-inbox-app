import { normalizeTaskTextForDedupe } from './taskTextDedupe';
import type { TaskItem } from './types';

const MIN_LEN_FOR_FUZZY = 12;
const JACCARD_THRESHOLD = 0.65;
const MIN_SUBSTRING_LEN = 4;

const PRIORITY_RANK: Record<'high' | 'medium' | 'low', number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function wordTokens(norm: string): Set<string> {
  return new Set(
    norm
      .split(/[^\p{L}\p{N}]+/u)
      .map((w) => w.toLowerCase())
      .filter((w) => w.length >= 2),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter += 1;
  }
  const u = a.size + b.size - inter;
  return u === 0 ? 0 : inter / u;
}

function pickLongerText(a: string, b: string): string {
  const ta = a.trim();
  const tb = b.trim();
  return ta.length >= tb.length ? ta : tb;
}

function mergeTaskText(base: TaskItem, other: TaskItem): string {
  return pickLongerText(base.text, other.text);
}

function mergePriority(
  a?: TaskItem['priority'],
  b?: TaskItem['priority'],
): TaskItem['priority'] | undefined {
  const ra = a ? PRIORITY_RANK[a] : 0;
  const rb = b ? PRIORITY_RANK[b] : 0;
  if (rb > ra) return b;
  if (ra > rb) return a;
  return a ?? b;
}

function mergeDeadline(a?: string | null, b?: string | null): string | undefined {
  if (!a?.trim()) return b?.trim() ?? undefined;
  if (!b?.trim()) return a.trim();
  return a <= b ? a : b;
}

function mergeDeadlineTime(a?: string | null, b?: string | null): string | undefined {
  if (!a?.trim()) return b?.trim() ?? undefined;
  if (!b?.trim()) return a.trim();
  return a <= b ? a : b;
}

function mergePair(keep: TaskItem, incoming: TaskItem): TaskItem {
  return {
    ...keep,
    text: mergeTaskText(keep, incoming),
    priority: mergePriority(keep.priority, incoming.priority),
    deadline: mergeDeadline(keep.deadline, incoming.deadline),
    deadlineTime: mergeDeadlineTime(keep.deadlineTime, incoming.deadlineTime),
  };
}

function areSimilar(
  normA: string,
  normB: string,
  tokensA: Set<string>,
  tokensB: Set<string>,
): boolean {
  if (normA === normB) return true;
  if (normA.length >= MIN_SUBSTRING_LEN && normB.length >= MIN_SUBSTRING_LEN) {
    if (normA.includes(normB) || normB.includes(normA)) return true;
  }
  if (normA.length >= MIN_LEN_FOR_FUZZY && normB.length >= MIN_LEN_FOR_FUZZY) {
    return jaccard(tokensA, tokensB) >= JACCARD_THRESHOLD;
  }
  return false;
}

/**
 * Collapses near-duplicate AI task lines (same wording, substring, or high token overlap).
 * Run on AI-produced tasks only, before merging with manual tasks.
 */
export function mergeSimilarExtractedTasks(tasks: TaskItem[]): TaskItem[] {
  const out: TaskItem[] = [];

  for (const t of tasks) {
    const norm = normalizeTaskTextForDedupe(t.text);
    if (!norm) continue;

    const tokens = wordTokens(norm);
    let merged = false;

    for (let i = 0; i < out.length; i += 1) {
      const existing = out[i];
      const normO = normalizeTaskTextForDedupe(existing.text);
      if (!normO) continue;
      const tokensO = wordTokens(normO);

      if (areSimilar(norm, normO, tokens, tokensO)) {
        out[i] = mergePair(existing, t);
        merged = true;
        break;
      }
    }

    if (!merged) {
      out.push({ ...t });
    }
  }

  return out;
}
