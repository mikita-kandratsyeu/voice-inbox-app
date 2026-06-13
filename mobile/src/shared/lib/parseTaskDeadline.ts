import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

import { formatTaskDeadlineDate } from './formatTaskDeadlineDate';
import { isString } from './type-guards';

dayjs.extend(customParseFormat);

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseTaskDeadline(deadline: string | null | undefined): Date | null {
  if (!deadline || !isString(deadline)) return null;

  const trimmed = deadline.trim();
  if (!trimmed) return null;

  const dateOnly = DATE_ONLY_RE.exec(trimmed);
  if (dateOnly) {
    const parsed = dayjs(trimmed, 'YYYY-MM-DD', true);
    return parsed.isValid() ? parsed.toDate() : null;
  }

  const parsed = dayjs(trimmed);
  if (!parsed.isValid()) return null;

  const normalized = formatTaskDeadlineDate(parsed.toDate());
  const strict = dayjs(normalized, 'YYYY-MM-DD', true);
  return strict.isValid() ? strict.toDate() : null;
}
