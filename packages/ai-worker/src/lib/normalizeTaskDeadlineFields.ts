export type NormalizedTaskDeadlineFields = {
  deadline: string;
  deadlineTime?: string;
};

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const HAS_TIME_COMPONENT_RE = /T\d{2}:\d{2}/;
const ISO_DATETIME_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/;

function pad2(n: number): string {
  return `${n}`.padStart(2, '0');
}

function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatLocalTime(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function isValidCalendarDate(y: number, mo: number, d: number): boolean {
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/**
 * Normalizes AI deadline input into canonical storage fields:
 * `deadline` = YYYY-MM-DD (local calendar date), optional `deadlineTime` = HH:mm (local).
 */
export function normalizeTaskDeadlineFields(value: unknown): NormalizedTaskDeadlineFields | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'null') return null;

  const dateOnlyMatch = DATE_ONLY_RE.exec(trimmed);
  if (dateOnlyMatch) {
    const y = Number(dateOnlyMatch[1]);
    const mo = Number(dateOnlyMatch[2]);
    const d = Number(dateOnlyMatch[3]);
    if (!isValidCalendarDate(y, mo, d)) return null;
    return { deadline: trimmed };
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime()) || !ISO_DATETIME_RE.test(trimmed)) return null;

  const deadline = formatLocalDate(parsed);

  if (!HAS_TIME_COMPONENT_RE.test(trimmed)) {
    return { deadline };
  }

  const deadlineTime = formatLocalTime(parsed);
  if (deadlineTime === '00:00') {
    return { deadline };
  }

  return { deadline, deadlineTime };
}
