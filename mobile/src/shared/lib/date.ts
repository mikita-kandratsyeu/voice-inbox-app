import 'dayjs/locale/ru';

import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import isoWeek from 'dayjs/plugin/isoWeek';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(duration);
dayjs.extend(isoWeek);
dayjs.extend(relativeTime);

export const resolveDayjsLocale = (locale: string | null | undefined): 'en' | 'ru' => {
  return locale?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
};

export const RU_WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;
export const EN_WEEKDAY_SHORT = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;

export function formatWeekdayShort(date: dayjs.Dayjs, locale: string | null | undefined): string {
  const resolved = resolveDayjsLocale(locale);
  const index = date.isoWeekday() - 1;
  const labels = resolved === 'ru' ? RU_WEEKDAY_SHORT : EN_WEEKDAY_SHORT;
  return labels[index] ?? date.format('dd');
}

export const formatRelativeTime = (isoDate: string, locale = 'en'): string => {
  const dayjsLocale = resolveDayjsLocale(locale);
  const date = dayjs(isoDate).locale(dayjsLocale);

  if (!date.isValid()) {
    return '';
  }

  const diffDays = dayjs().diff(date, 'day');

  if (diffDays < 7) {
    return date.fromNow();
  }

  return formatShortDate(isoDate, locale);
};

const SHORT_DATE_SHOW_YEAR_SAME_YEAR_AFTER_DAYS = 90;

/** Local date + time for share-link expiry (no timezone suffix — users expect device local time). */
export const formatShareExpiresAt = (isoDate: string, locale = 'en'): string => {
  const dayjsLocale = resolveDayjsLocale(locale);
  const date = dayjs(isoDate).locale(dayjsLocale);

  if (!date.isValid()) {
    return isoDate;
  }

  return date.format('D MMM YYYY, HH:mm');
};

export const formatShortDate = (isoDate: string, locale = 'en'): string => {
  const dayjsLocale = resolveDayjsLocale(locale);
  const date = dayjs(isoDate).locale(dayjsLocale);
  const now = dayjs();

  if (!date.isValid()) {
    return isoDate;
  }

  const isCurrentYear = date.year() === now.year();
  const ageDays = now.diff(date, 'day');
  const showYear = !isCurrentYear || ageDays >= SHORT_DATE_SHOW_YEAR_SAME_YEAR_AFTER_DAYS;

  return showYear ? date.format('D MMM YYYY') : date.format('D MMM');
};

export const formatTime = (seconds: number): string => {
  const d = dayjs.duration(seconds, 'seconds');
  const totalMins = Math.floor(d.asMinutes());
  const secs = d.seconds();

  return `${totalMins}:${secs.toString().padStart(2, '0')}`;
};

export const formatDurationMmSs = (milliseconds: number): string => {
  const totalSecs = Math.floor(Math.max(0, milliseconds) / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;

  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const formatTimeWithMs = (milliseconds: number): { main: string; ms: string } => {
  const d = dayjs.duration(milliseconds, 'milliseconds');
  const totalMins = Math.floor(d.asMinutes());
  const secs = Math.floor(d.seconds());
  const tenths = Math.floor((milliseconds % 1000) / 100);

  return {
    main: `${totalMins}:${secs.toString().padStart(2, '0')}`,
    ms: `.${tenths}`,
  };
};
