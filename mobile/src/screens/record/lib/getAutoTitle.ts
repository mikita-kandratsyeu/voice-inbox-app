import dayjs from 'dayjs';

import { i18n } from '@/shared/lib';
import { resolveDayjsLocale } from '@/shared/lib/date';

function formatAutoTitleDate(date: dayjs.Dayjs): string {
  return date.locale(resolveDayjsLocale(i18n.language)).format('D MMMM');
}

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
  const now = dayjs();
  const period = getPeriodForHour(now.hour());

  if (!useDate) return period;

  return `${period} · ${formatAutoTitleDate(now)}`;
};

export const getAutoTitleForDate = (isoDate: string): string => {
  const d = dayjs(isoDate);

  return `${getPeriodForHour(d.hour())} · ${formatAutoTitleDate(d)}`;
};
