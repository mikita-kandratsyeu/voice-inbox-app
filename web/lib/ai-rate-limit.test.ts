import { FREE_WEEKLY_LIMIT, PRO_WEEKLY_LIMIT } from '../config/constants';
import { getResetAt, resolveWeeklyLimit } from './ai-rate-limit';

describe('resolveWeeklyLimit', () => {
  it('picks Pro or free weekly cap', () => {
    expect(
      resolveWeeklyLimit({
        isPro: true,
        weeklyLimits: { freeWeeklyLimit: FREE_WEEKLY_LIMIT, proWeeklyLimit: PRO_WEEKLY_LIMIT },
      }),
    ).toBe(PRO_WEEKLY_LIMIT);
    expect(
      resolveWeeklyLimit({
        isPro: false,
        weeklyLimits: { freeWeeklyLimit: FREE_WEEKLY_LIMIT, proWeeklyLimit: PRO_WEEKLY_LIMIT },
      }),
    ).toBe(FREE_WEEKLY_LIMIT);
  });
});

describe('getResetAt', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-09T15:30:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns next Monday 00:00 UTC', () => {
    expect(getResetAt().toISOString()).toBe('2026-06-15T00:00:00.000Z');
  });
});
