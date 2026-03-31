import 'dayjs/locale/ru';

import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(duration);
dayjs.extend(relativeTime);

export const resolveDayjsLocale = (locale: string | null | undefined): 'en' | 'ru' => {
  return locale?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
};

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

export const formatShortDate = (isoDate: string, locale = 'en'): string => {
  const dayjsLocale = resolveDayjsLocale(locale);
  const date = dayjs(isoDate).locale(dayjsLocale);

  if (!date.isValid()) {
    return isoDate;
  }

  const isCurrentYear = date.year() === dayjs().year();

  return isCurrentYear ? date.format('D MMM') : date.format('D MMM YYYY');
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
