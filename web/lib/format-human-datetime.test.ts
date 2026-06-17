import {
  formatAbsoluteDateTime,
  formatHumanFutureDateTime,
  formatHumanPastDateTime,
  type HumanDateTimeLabels,
} from './format-human-datetime';

const enLabels: HumanDateTimeLabels = {
  justNow: 'just now',
  todayAt: 'today at {time}',
  yesterdayAt: 'yesterday at {time}',
  tomorrowAt: 'tomorrow at {time}',
  expired: 'expired',
};

const ruLabels: HumanDateTimeLabels = {
  justNow: 'только что',
  todayAt: 'сегодня в {time}',
  yesterdayAt: 'вчера в {time}',
  tomorrowAt: 'завтра в {time}',
  expired: 'истекла',
};

describe('format-human-datetime', () => {
  test('formatHumanPastDateTime uses relative minutes for recent past', () => {
    const now = new Date('2026-06-17T12:00:00');
    const date = new Date('2026-06-17T11:45:00');
    const formatted = formatHumanPastDateTime(date, now, 'en', enLabels);
    expect(formatted).toMatch(/15 minutes ago|15 min/i);
  });

  test('formatHumanPastDateTime uses yesterday label', () => {
    const now = new Date('2026-06-17T12:00:00');
    const date = new Date('2026-06-16T20:54:00');
    const formatted = formatHumanPastDateTime(date, now, 'en', enLabels);
    expect(formatted).toMatch(/^yesterday at /i);
  });

  test('formatHumanFutureDateTime uses relative hours for near future', () => {
    const now = new Date('2026-06-17T12:00:00');
    const date = new Date('2026-06-17T14:00:00');
    const formatted = formatHumanFutureDateTime(date, now, 'en', enLabels);
    expect(formatted).toMatch(/in 2 hours|2 hours/i);
  });

  test('formatHumanFutureDateTime uses tomorrow label', () => {
    const now = new Date('2026-06-17T12:00:00');
    const date = new Date('2026-06-18T20:54:00');
    const formatted = formatHumanFutureDateTime(date, now, 'en', enLabels);
    expect(formatted).toMatch(/^tomorrow at /i);
  });

  test('formatAbsoluteDateTime localizes month names', () => {
    const formatted = formatAbsoluteDateTime(new Date('2026-06-16T20:54:00'), 'ru');
    expect(formatted).toMatch(/2026/);
    expect(formatted).not.toContain('T20:54:00');
  });

  test('formatHumanPastDateTime localizes in Russian', () => {
    const now = new Date('2026-06-17T12:00:00');
    const date = new Date('2026-06-16T20:54:00');
    const formatted = formatHumanPastDateTime(date, now, 'ru', ruLabels);
    expect(formatted).toMatch(/^вчера в /);
  });
});
