import 'dayjs/locale/ru';

import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(duration);
dayjs.extend(relativeTime);

const getDayjsLocale = (): string => {
  try {
    const i18n = require('i18next').default;
    const lang = i18n?.language ?? 'en';
    return lang.startsWith('ru') ? 'ru' : 'en';
  } catch {
    return 'en';
  }
};

export const formatRelativeTime = (isoDate: string): string => {
  const locale = getDayjsLocale();
  const date = dayjs(isoDate).locale(locale);

  if (!date.isValid()) {
    return '';
  }

  const diffDays = dayjs().diff(date, 'day');

  if (diffDays < 7) {
    return date.fromNow();
  }

  return formatShortDate(isoDate);
};

export const formatShortDate = (isoDate: string): string => {
  const locale = getDayjsLocale();
  const date = dayjs(isoDate).locale(locale);

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

export const formatTimeWithMs = (milliseconds: number): { main: string; ms: string } => {
  const d = dayjs.duration(milliseconds, 'milliseconds');
  const totalMins = Math.floor(d.asMinutes());
  const secs = Math.floor(d.seconds());
  const cs = Math.floor((milliseconds % 1000) / 10);

  return {
    main: `${totalMins}:${secs.toString().padStart(2, '0')}`,
    ms: `.${cs.toString().padStart(2, '0')}`,
  };
};
