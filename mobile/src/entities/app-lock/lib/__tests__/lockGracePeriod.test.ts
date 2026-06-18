import { normalizeAppLockGracePeriodMs, shouldRequireAppLock } from '../lockGracePeriod';

describe('lockGracePeriod', () => {
  describe('normalizeAppLockGracePeriodMs', () => {
    it('returns known values unchanged', () => {
      expect(normalizeAppLockGracePeriodMs(0)).toBe(0);
      expect(normalizeAppLockGracePeriodMs(60_000)).toBe(60_000);
      expect(normalizeAppLockGracePeriodMs(300_000)).toBe(300_000);
      expect(normalizeAppLockGracePeriodMs(900_000)).toBe(900_000);
    });

    it('falls back to immediately for unknown values', () => {
      expect(normalizeAppLockGracePeriodMs(undefined)).toBe(0);
      expect(normalizeAppLockGracePeriodMs(120_000)).toBe(0);
    });
  });

  describe('shouldRequireAppLock', () => {
    const lastUnlockedAtMs = 1_000_000;

    it('always requires lock in immediate mode', () => {
      expect(
        shouldRequireAppLock({
          nowMs: lastUnlockedAtMs,
          gracePeriodMs: 0,
          lastUnlockedAtMs,
        }),
      ).toBe(true);
    });

    it('skips lock when returning inside the grace window', () => {
      expect(
        shouldRequireAppLock({
          nowMs: lastUnlockedAtMs + 30_000,
          gracePeriodMs: 60_000,
          lastUnlockedAtMs,
        }),
      ).toBe(false);
    });

    it('requires lock after the grace window expires', () => {
      expect(
        shouldRequireAppLock({
          nowMs: lastUnlockedAtMs + 60_000,
          gracePeriodMs: 60_000,
          lastUnlockedAtMs,
        }),
      ).toBe(true);
    });

    it('requires lock when there is no prior unlock timestamp', () => {
      expect(
        shouldRequireAppLock({
          nowMs: 2_000_000,
          gracePeriodMs: 300_000,
          lastUnlockedAtMs: 0,
        }),
      ).toBe(true);
    });
  });
});
