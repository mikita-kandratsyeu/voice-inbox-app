import {
  formatProOfferCodeDisplay,
  isCompleteProOfferCode,
  parseProOfferCodeInput,
} from '../proOfferCodeFormat';

describe('parseProOfferCodeInput', () => {
  it('normalizes spacing and separators', () => {
    expect(parseProOfferCodeInput('vi-2345-6789-abcd')).toBe('VI23456789ABCD');
  });

  it('filters characters outside the offer-code alphabet', () => {
    expect(parseProOfferCodeInput('VI12O0I1')).toBe('VI2');
    expect(parseProOfferCodeInput('VI-2A3B-4C5D-6E7F')).toBe('VI2A3B4C5D6E7F');
  });

  it('returns empty for input without VI prefix', () => {
    expect(parseProOfferCodeInput('ABCD')).toBe('');
  });

  it('preserves partial prefix while typing', () => {
    expect(parseProOfferCodeInput('v')).toBe('V');
    expect(parseProOfferCodeInput('vi')).toBe('VI');
  });
});

describe('formatProOfferCodeDisplay', () => {
  it('formats compact code into VI-XXXX-XXXX-XXXX segments', () => {
    expect(formatProOfferCodeDisplay('VI23456789ABCD')).toBe('VI-2345-6789-ABCD');
  });

  it('formats partial input progressively', () => {
    expect(formatProOfferCodeDisplay('V')).toBe('V');
    expect(formatProOfferCodeDisplay('VI')).toBe('VI');
    expect(formatProOfferCodeDisplay('VI2345')).toBe('VI-2345');
  });
});

describe('isCompleteProOfferCode', () => {
  it('requires VI plus 12 segment characters', () => {
    expect(isCompleteProOfferCode('VI23456789ABCD')).toBe(true);
    expect(isCompleteProOfferCode('VI23456789ABC')).toBe(false);
  });
});
