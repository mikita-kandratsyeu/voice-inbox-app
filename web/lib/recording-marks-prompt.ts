export const RECORDING_MARK_KINDS = ['moment', 'important', 'task', 'quote'] as const;

export type RecordingMarkKind = (typeof RECORDING_MARK_KINDS)[number];

export type RecordingMarkForPrompt = {
  offsetMs: number;
  label: string;
  kind: RecordingMarkKind;
};

export const RECORDING_MARKS_PROMPT_MAX_ITEMS = 40;
export const RECORDING_MARKS_PROMPT_LABEL_MAX_CHARS = 300;

const DEFAULT_KIND: RecordingMarkKind = 'moment';

export function normalizeRecordingMarkKind(raw: unknown): RecordingMarkKind {
  if (typeof raw === 'string' && (RECORDING_MARK_KINDS as readonly string[]).includes(raw)) {
    return raw as RecordingMarkKind;
  }
  return DEFAULT_KIND;
}

export function formatRecordingMarkOffset(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function sanitizeRecordingMarksForPrompt(
  raw: unknown,
): RecordingMarkForPrompt[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;

  const out: RecordingMarkForPrompt[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const offsetMs = o.offsetMs;
    if (typeof offsetMs !== 'number' || !Number.isFinite(offsetMs) || offsetMs < 0) continue;
    const rawLabel = typeof o.label === 'string' ? o.label : '';
    const label = rawLabel
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, RECORDING_MARKS_PROMPT_LABEL_MAX_CHARS);
    out.push({
      offsetMs: Math.floor(offsetMs),
      label,
      kind: normalizeRecordingMarkKind(o.kind),
    });
    if (out.length >= RECORDING_MARKS_PROMPT_MAX_ITEMS) break;
  }

  if (out.length === 0) return undefined;

  out.sort((a, b) => a.offsetMs - b.offsetMs);
  return out;
}

const KIND_RULES = [
  '- [important]: must be reflected in summary when transcript near the timestamp supports it; do not drop when trimming.',
  '- [task]: prioritize tasks[] from content within ~30s before/after; do not duplicate existing saved tasks.',
  '- [quote]: preserve exact wording in summary (dedicated sentence or short quote block); do not paraphrase the pinned phrase.',
  '- [moment]: general pin — give moderate weight in summary and nextSteps when supported.',
].join('\n');

export function buildRecordingMarksPromptBlock(marks: RecordingMarkForPrompt[]): string {
  if (marks.length === 0) return '';

  const lines = marks.map((m) => {
    const time = formatRecordingMarkOffset(m.offsetMs);
    const kind = normalizeRecordingMarkKind(m.kind);
    if (m.label.length > 0) {
      return `- [${kind}] [${time}] "${m.label.replace(/"/g, "'")}"`;
    }
    return `- [${kind}] [${time}] (no label)`;
  });

  return [
    '## RECORDING PINS (user-placed during capture)',
    'Each pin has a type: important | task | quote | moment. Trust types and labels as user intent.',
    KIND_RULES,
    '- Do not invent tasks or facts solely from a pin if the transcript does not support them.',
    '',
    ...lines,
    '',
  ].join('\n');
}
