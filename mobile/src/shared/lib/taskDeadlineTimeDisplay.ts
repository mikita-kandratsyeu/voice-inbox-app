import dayjs from 'dayjs';
import { uses24HourClock } from 'react-native-localize';

import { resolveDayjsLocale } from './date';
import { isString } from './type-guards';

export function parseTaskDeadlineTime(
  hhmm: string | null | undefined,
): { hours: number; minutes: number } | null {
  if (!hhmm || !isString(hhmm)) return null;

  const trimmed = hhmm.trim();

  const match = /^(\d{2}):(\d{2})$/.exec(trimmed);

  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return { hours, minutes };
}

export function formatLocalTimeOfDay(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: !uses24HourClock(),
  });
}

export function formatTaskDeadlineTimeForDisplay(hhmm: string | null | undefined): string {
  const parsed = parseTaskDeadlineTime(hhmm);

  if (!parsed) {
    if (hhmm && isString(hhmm) && hhmm.trim().length > 0) {
      return hhmm.trim();
    }

    return '';
  }

  const date = new Date();
  date.setHours(parsed.hours, parsed.minutes, 0, 0);

  return formatLocalTimeOfDay(date);
}

export function formatLocalizedLongDateWithTime(isoString: string, language: string): string {
  const dayjsLocale = resolveDayjsLocale(language);
  const date = dayjs(isoString);

  if (!date.isValid()) return '—';

  return `${date.locale(dayjsLocale).format('dddd, D MMMM')} ${formatLocalTimeOfDay(date.toDate())}`;
}
