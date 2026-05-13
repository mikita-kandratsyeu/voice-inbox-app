import type { AiProcessingResult, AiTask, RecordClassification } from '@/shared/lib/ai-api/aiApi';
import { isRecord, isString } from '@/shared/lib/type-guards';

import { FIELD_LIMITS } from './localAiConstants';
import { LocalAiError } from './localAiErrors';

const DEADLINE_ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

const CLASSIFICATION_VALUES: readonly RecordClassification[] = [
  'personal',
  'work',
  'meeting',
  'idea',
  'other',
] as const;

export function normalizeDeadline(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (!isString(value)) return null;

  const t = value.trim();

  if (!t || t.toLowerCase() === 'null') return null;
  if (!DEADLINE_ISO_RE.test(t)) return null;

  const [ys, ms, ds] = t.split('-');
  const y = Number(ys);
  const mo = Number(ms);
  const d = Number(ds);
  const dt = new Date(Date.UTC(y, mo - 1, d));

  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    return null;
  }

  return t;
}

export function normalizeClassification(value: unknown): RecordClassification | undefined {
  if (!isString(value)) return undefined;

  const x = value.trim().toLowerCase();

  return (CLASSIFICATION_VALUES as readonly string[]).includes(x)
    ? (x as RecordClassification)
    : undefined;
}

function normalizePriority(value: string): AiTask['priority'] {
  const p = value.trim().toLowerCase();

  if (p === 'high' || p === 'low' || p === 'medium') return p;

  return 'medium';
}

export function sanitizeStringArray(
  value: unknown,
  opts: { max: number; dedupeCaseInsensitive: boolean; lowercase?: boolean },
): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of value) {
    if (!isString(item)) continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const stored = opts.lowercase ? trimmed.toLowerCase() : trimmed;
    const dedupeKey = opts.dedupeCaseInsensitive ? stored.toLowerCase() : stored;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push(stored);
    if (out.length >= opts.max) break;
  }

  return out;
}

export function sanitizeTasks(value: unknown): AiTask[] {
  if (!Array.isArray(value)) return [];

  const out: AiTask[] = [];

  for (const item of value) {
    if (out.length >= FIELD_LIMITS.tasks) break;
    if (!isRecord(item)) continue;
    const v = item;
    const title = isString(v.title) ? v.title.trim() : '';
    if (!title) continue;
    const priority = isString(v.priority) ? normalizePriority(v.priority) : 'medium';
    const deadline = normalizeDeadline(v.deadline);
    out.push({ title, priority, deadline });
  }

  return out;
}

function clampSuggestedTitle(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;

  const t = raw.trim();

  if (!t) return undefined;
  if (t.length <= FIELD_LIMITS.suggestedTitleMaxChars) return t;

  return t.slice(0, FIELD_LIMITS.suggestedTitleMaxChars).trimEnd();
}

export function sanitizeSummaryPayload(
  parsed: Record<string, unknown>,
  opts?: { includePseudoDiarization?: boolean },
): AiProcessingResult {
  const summaryRaw = isString(parsed.summary) ? parsed.summary.trim() : '';
  if (!summaryRaw) {
    throw new LocalAiError('empty_summary', 'Local summary is empty');
  }

  const suggestedTitle = clampSuggestedTitle(
    isString(parsed.suggestedTitle) ? parsed.suggestedTitle : undefined,
  );

  const classification = normalizeClassification(parsed.classification);

  const result: AiProcessingResult = {
    summary: summaryRaw,
    ...(suggestedTitle ? { suggestedTitle } : {}),
    tasks: sanitizeTasks(parsed.tasks),
    tags: sanitizeStringArray(parsed.tags, {
      max: FIELD_LIMITS.tags,
      dedupeCaseInsensitive: true,
      lowercase: true,
    }),
    ...(classification ? { classification } : {}),
    keyPhrases: sanitizeStringArray(parsed.keyPhrases, {
      max: FIELD_LIMITS.keyPhrases,
      dedupeCaseInsensitive: true,
    }),
    nextSteps: sanitizeStringArray(parsed.nextSteps, {
      max: FIELD_LIMITS.nextSteps,
      dedupeCaseInsensitive: true,
    }),
  };

  if (opts?.includePseudoDiarization) {
    const rawMd = parsed.meetingDialogueMarkdown;
    if (isString(rawMd)) {
      const t = rawMd.trim();
      if (t) {
        result.meetingDialogueMarkdown =
          t.length > FIELD_LIMITS.meetingDialogueMaxChars
            ? t.slice(0, FIELD_LIMITS.meetingDialogueMaxChars)
            : t;
      }
    }
  }

  return result;
}
