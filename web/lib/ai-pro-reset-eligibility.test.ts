import { PRO_RESET_USAGE_THRESHOLD } from '../config/constants';
import { isProResetEligible } from './ai-pro-reset-eligibility';

describe('isProResetEligible', () => {
  it('returns false when limit is zero', () => {
    expect(isProResetEligible({ used: 0, limit: 0, remaining: 0 })).toBe(false);
  });

  it('returns true when remaining is zero', () => {
    expect(isProResetEligible({ used: 75, limit: 75, remaining: 0 })).toBe(true);
  });

  it('returns true at usage threshold', () => {
    const limit = 100;
    const used = Math.ceil(limit * PRO_RESET_USAGE_THRESHOLD);
    expect(isProResetEligible({ used, limit, remaining: limit - used })).toBe(true);
  });

  it('returns false below threshold with remaining quota', () => {
    expect(isProResetEligible({ used: 50, limit: 100, remaining: 50 })).toBe(false);
  });
});
