import { isProResetEligible, PRO_RESET_USAGE_THRESHOLD } from '../aiUsageProReset';

describe('isProResetEligible', () => {
  it('returns false when limit is zero or negative', () => {
    expect(isProResetEligible({ used: 0, limit: 0, remaining: 0 })).toBe(false);
  });

  it('returns true when remaining is zero', () => {
    expect(isProResetEligible({ used: 100, limit: 100, remaining: 0 })).toBe(true);
  });

  it('returns true when usage reaches threshold', () => {
    const limit = 100;
    const used = Math.ceil(limit * PRO_RESET_USAGE_THRESHOLD);
    expect(isProResetEligible({ used, limit, remaining: limit - used })).toBe(true);
  });

  it('returns false below threshold with remaining quota', () => {
    expect(isProResetEligible({ used: 50, limit: 100, remaining: 50 })).toBe(false);
  });
});
