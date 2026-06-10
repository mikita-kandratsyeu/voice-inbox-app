import '@/shared/lib/date';

import dayjs from 'dayjs';

import {
  formatCalendarHeaderDate,
  formatWeekdayShort,
  getIsoWeekDays,
  resolveWeekSlideDirection,
  shiftCalendarDateByWeeks,
} from '../allTasksCalendarDate';

describe('allTasksCalendarDate', () => {
  describe('formatCalendarHeaderDate', () => {
    it('formats Russian header with year suffix', () => {
      const date = dayjs('2026-06-09').locale('ru');
      expect(formatCalendarHeaderDate(date, 'ru')).toBe('9 июня 2026 г.');
    });

    it('formats English header without suffix', () => {
      const date = dayjs('2026-06-09').locale('en');
      expect(formatCalendarHeaderDate(date, 'en')).toBe('9 June 2026');
    });
  });

  describe('formatWeekdayShort', () => {
    it('uses compact Russian weekday labels', () => {
      const tuesday = dayjs('2026-06-09').locale('ru');
      expect(formatWeekdayShort(tuesday, 'ru')).toBe('Вт');
    });

    it('capitalizes English weekday labels', () => {
      const tuesday = dayjs('2026-06-09').locale('en');
      expect(formatWeekdayShort(tuesday, 'en')).toBe('Tue');
    });
  });

  describe('getIsoWeekDays', () => {
    it('returns Monday through Sunday for the selected date week', () => {
      const days = getIsoWeekDays(new Date('2026-06-09T12:00:00'), 'en');

      expect(days).toHaveLength(7);
      expect(days[0]?.format('YYYY-MM-DD')).toBe('2026-06-08');
      expect(days[6]?.format('YYYY-MM-DD')).toBe('2026-06-14');
    });
  });

  describe('shiftCalendarDateByWeeks', () => {
    it('moves the selected date by whole weeks', () => {
      const base = new Date('2026-06-09T10:00:00');

      expect(dayjs(shiftCalendarDateByWeeks(base, 1)).format('YYYY-MM-DD')).toBe('2026-06-16');
      expect(dayjs(shiftCalendarDateByWeeks(base, -1)).format('YYYY-MM-DD')).toBe('2026-06-02');
    });
  });

  describe('resolveWeekSlideDirection', () => {
    it('detects previous, next, and same week transitions', () => {
      const selected = new Date('2026-06-09T12:00:00');

      expect(resolveWeekSlideDirection(selected, new Date('2026-06-02T12:00:00'))).toBe('prev');
      expect(resolveWeekSlideDirection(selected, new Date('2026-06-16T12:00:00'))).toBe('next');
      expect(resolveWeekSlideDirection(selected, new Date('2026-06-11T12:00:00'))).toBe('none');
    });
  });
});
