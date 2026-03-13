import dayjs from 'dayjs';

import { i18n } from '@/shared/lib';

export const getAutoTitle = (): string => {
  const hour = new Date().getHours();
  const date = dayjs().format('MMM D');
  let period: string;
  if (hour >= 5 && hour < 12) {
    period = i18n.t('record.autoTitle.morning');
  } else if (hour >= 12 && hour < 17) {
    period = i18n.t('record.autoTitle.afternoon');
  } else if (hour >= 17 && hour < 22) {
    period = i18n.t('record.autoTitle.evening');
  } else {
    period = i18n.t('record.autoTitle.night');
  }
  return `${period} · ${date}`;
};
