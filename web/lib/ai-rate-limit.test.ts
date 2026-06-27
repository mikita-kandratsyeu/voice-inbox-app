import { AI_USAGE_PERIOD_MS } from '../config/constants';
import {
  computeResetAtFromPeriodStart,
  resolveDeviceUsagePeriod,
  resolveWeeklyLimit,
} from './ai-rate-limit';
import { redis } from './redis';

jest.mock('./redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    setIfNotExists: jest.fn(),
    incrementWithinLimit: jest.fn(),
    decrByWithFloor: jest.fn(),
    expire: jest.fn(),
    incr: jest.fn(),
    decr: jest.fn(),
  },
}));

const mockedRedis = redis as jest.Mocked<typeof redis>;

describe('resolveWeeklyLimit', () => {
  it('picks Pro or free weekly cap', () => {
    expect(
      resolveWeeklyLimit({
        isPro: true,
        weeklyLimits: { freeWeeklyLimit: 10, proWeeklyLimit: 75 },
      }),
    ).toBe(75);
    expect(
      resolveWeeklyLimit({
        isPro: false,
        weeklyLimits: { freeWeeklyLimit: 10, proWeeklyLimit: 75 },
      }),
    ).toBe(10);
  });
});

describe('computeResetAtFromPeriodStart', () => {
  it('returns period start plus seven days', () => {
    const start = Date.parse('2026-06-09T15:30:00.000Z');
    expect(computeResetAtFromPeriodStart(start).toISOString()).toBe('2026-06-16T15:30:00.000Z');
  });
});

describe('resolveDeviceUsagePeriod', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an unstarted period when no anchor exists', async () => {
    mockedRedis.get.mockResolvedValue(null);
    const now = Date.parse('2026-06-09T12:00:00.000Z');

    const period = await resolveDeviceUsagePeriod('device-1', now);

    expect(period.hasStarted).toBe(false);
    expect(period.periodStartMs).toBeNull();
    expect(period.resetAt.toISOString()).toBe('2026-06-16T12:00:00.000Z');
    expect(period.usageKey).toBe('ai_weekly:device-1');
    expect(mockedRedis.set).not.toHaveBeenCalled();
  });

  it('keeps the active period before reset time', async () => {
    const start = Date.parse('2026-06-09T15:30:00.000Z');
    mockedRedis.get.mockImplementation(async (key: string) => {
      if (key === 'ai_period_start:device-1') return String(start);
      if (key === 'ai_weekly:device-1') return '4';
      return null;
    });

    const period = await resolveDeviceUsagePeriod('device-1', start + AI_USAGE_PERIOD_MS - 1_000);

    expect(period.hasStarted).toBe(true);
    expect(period.periodStartMs).toBe(start);
    expect(period.resetAt.toISOString()).toBe('2026-06-16T15:30:00.000Z');
    expect(mockedRedis.set).not.toHaveBeenCalled();
  });

  it('rolls the period forward and resets counters after seven days', async () => {
    const start = Date.parse('2026-06-09T15:30:00.000Z');
    const now = start + AI_USAGE_PERIOD_MS + 60_000;
    mockedRedis.get.mockImplementation(async (key: string) => {
      if (key === 'ai_period_start:device-1') return String(start);
      return null;
    });

    const period = await resolveDeviceUsagePeriod('device-1', now);

    expect(period.periodStartMs).toBe(start + AI_USAGE_PERIOD_MS);
    expect(period.resetAt.toISOString()).toBe('2026-06-23T15:30:00.000Z');
    expect(mockedRedis.set).toHaveBeenCalledWith(
      'ai_period_start:device-1',
      String(start + AI_USAGE_PERIOD_MS),
    );
    expect(mockedRedis.set).toHaveBeenCalledWith('ai_weekly:device-1', '0');
    expect(mockedRedis.set).toHaveBeenCalledWith('ai_auto_organize_weekly:device-1', '0');
  });

  it('skips inactive weeks without stacking unused periods', async () => {
    const start = Date.parse('2026-06-09T15:30:00.000Z');
    const now = start + AI_USAGE_PERIOD_MS * 3 + 60_000;
    mockedRedis.get.mockImplementation(async (key: string) => {
      if (key === 'ai_period_start:device-1') return String(start);
      return null;
    });

    const period = await resolveDeviceUsagePeriod('device-1', now);

    expect(period.periodStartMs).toBe(start + AI_USAGE_PERIOD_MS * 3);
    expect(period.resetAt.toISOString()).toBe('2026-07-07T15:30:00.000Z');
  });
});
