import { fromDatetimeLocalValue, toDatetimeLocalValue } from './adminDatetimeLocal';

describe('adminDatetimeLocal', () => {
  it('round-trips local datetime input to ISO', () => {
    const iso = fromDatetimeLocalValue('2026-06-23T15:30');
    expect(iso).toBeTruthy();
    expect(toDatetimeLocalValue(iso)).toBe('2026-06-23T15:30');
  });

  it('returns empty string for missing ISO', () => {
    expect(toDatetimeLocalValue(null)).toBe('');
    expect(toDatetimeLocalValue('')).toBe('');
  });

  it('returns null for empty local input', () => {
    expect(fromDatetimeLocalValue('')).toBeNull();
    expect(fromDatetimeLocalValue('   ')).toBeNull();
  });
});
