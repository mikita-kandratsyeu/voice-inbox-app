import { formatGroupedInteger } from '../formatGroupedInteger';
import { formatTokenCount } from '../formatTokenCount';

describe('formatGroupedInteger', () => {
  it('groups thousands with comma by default', () => {
    expect(formatGroupedInteger(1234567)).toBe('1,234,567');
  });

  it('uses narrow no-break space for Russian locale', () => {
    expect(formatGroupedInteger(10000, 'ru')).toBe('10\u00a0000');
  });

  it('handles negative values', () => {
    expect(formatGroupedInteger(-1200, 'en')).toBe('-1,200');
  });

  it('returns 0 for non-finite values', () => {
    expect(formatGroupedInteger(Number.NaN)).toBe('0');
    expect(formatGroupedInteger(Number.POSITIVE_INFINITY)).toBe('0');
  });
});

describe('formatTokenCount', () => {
  it('returns 0 for invalid values', () => {
    expect(formatTokenCount(-5)).toBe('0');
    expect(formatTokenCount(Number.NaN)).toBe('0');
  });

  it('formats positive token counts', () => {
    expect(formatTokenCount(15342, 'en')).toBe('15,342');
  });
});
