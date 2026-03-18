import dayjs from 'dayjs';

import { i18n } from '@/shared/lib';

function getPeriodForHour(hour: number): string {
  if (hour >= 5 && hour < 12) {
    return i18n.t('record.autoTitle.morning');
  }

  if (hour >= 12 && hour < 17) {
    return i18n.t('record.autoTitle.afternoon');
  }

  if (hour >= 17 && hour < 22) {
    return i18n.t('record.autoTitle.evening');
  }

  return i18n.t('record.autoTitle.night');
}

export const getAutoTitle = (useDate = true): string => {
  const hour = new Date().getHours();
  const date = dayjs().format('MMM D');

  return `${getPeriodForHour(hour)} ${useDate ? `· ${date}` : ''}`;
};

export const getAutoTitleForDate = (isoDate: string): string => {
  const d = dayjs(isoDate);
  const hour = d.hour();
  const date = d.format('MMM D');

  return `${getPeriodForHour(hour)} · ${date}`;
};
