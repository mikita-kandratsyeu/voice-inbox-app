import '@/shared/lib/date';

import dayjs from 'dayjs';

export { EN_WEEKDAY_SHORT, formatWeekdayShort, RU_WEEKDAY_SHORT } from '@/shared/lib/date';

export type WeekSlideDirection = 'prev' | 'next' | 'none';

export function capitalizeFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatCalendarHeaderDate(date: dayjs.Dayjs, language: string): string {
  if (language.startsWith('ru')) {
    return `${date.format('D MMMM YYYY')} г.`;
  }

  return date.format('D MMMM YYYY');
}

export function getIsoWeekDays(selectedDate: Date, locale: 'en' | 'ru' = 'en'): dayjs.Dayjs[] {
  const selected = dayjs(selectedDate).locale(locale);
  const startOfWeek = selected.startOf('isoWeek');

  return Array.from({ length: 7 }, (_, index) => startOfWeek.add(index, 'day'));
}

export function shiftCalendarDateByWeeks(date: Date, weeks: number): Date {
  return dayjs(date)
    .add(weeks * 7, 'day')
    .toDate();
}

export function resolveWeekSlideDirection(
  selectedDate: Date,
  targetDate: Date,
): WeekSlideDirection {
  const currentWeek = dayjs(selectedDate).startOf('isoWeek');
  const targetWeek = dayjs(targetDate).startOf('isoWeek');

  if (targetWeek.isBefore(currentWeek, 'day')) return 'prev';
  if (targetWeek.isAfter(currentWeek, 'day')) return 'next';
  return 'none';
}
