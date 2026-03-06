import 'dayjs/locale/ru';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('ru');

export const formatRelativeTime = (isoDate: string): string => {
  const date = dayjs(isoDate);

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
  const date = dayjs(isoDate);

  if (!date.isValid()) {
    return isoDate;
  }

  const isCurrentYear = date.year() === dayjs().year();

  return isCurrentYear ? date.format('D MMM') : date.format('D MMM YYYY');
};
