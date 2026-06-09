import {
  addCalendarMonthsUtc,
  addUtcDays,
  computeNominalGrantEndUtc,
} from './pro-license-expiry-math';

describe('pro-license-expiry-math', () => {
  it('addUtcDays adds calendar days in UTC', () => {
    const base = new Date('2026-01-15T12:00:00.000Z');
    expect(addUtcDays(base, 7).toISOString()).toBe('2026-01-22T12:00:00.000Z');
  });

  it('addCalendarMonthsUtc handles month-end overflow', () => {
    const base = new Date('2026-01-31T00:00:00.000Z');
    expect(addCalendarMonthsUtc(base, 1).toISOString()).toBe('2026-02-28T00:00:00.000Z');
  });

  it('computeNominalGrantEndUtc uses days when durationDays is set', () => {
    const consumedAt = new Date('2026-06-01T00:00:00.000Z');
    expect(computeNominalGrantEndUtc(consumedAt, 12, 14).toISOString()).toBe(
      '2026-06-15T00:00:00.000Z',
    );
  });

  it('computeNominalGrantEndUtc uses months when durationDays is null', () => {
    const consumedAt = new Date('2026-06-01T00:00:00.000Z');
    expect(computeNominalGrantEndUtc(consumedAt, 3, null).toISOString()).toBe(
      '2026-09-01T00:00:00.000Z',
    );
  });
});
