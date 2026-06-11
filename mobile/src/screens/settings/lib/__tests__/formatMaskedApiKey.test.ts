import { formatMaskedApiKey } from '../formatMaskedApiKey';

describe('formatMaskedApiKey', () => {
  it('returns empty string for blank input', () => {
    expect(formatMaskedApiKey('')).toBe('');
    expect(formatMaskedApiKey('   ')).toBe('');
  });

  it('masks short keys entirely', () => {
    expect(formatMaskedApiKey('abcd')).toBe('••••');
    expect(formatMaskedApiKey('abcde')).toBe('•••••');
  });

  it('shows sk- prefix, bullets, and last four characters', () => {
    expect(formatMaskedApiKey('sk-abcdefghijklmnopqrstuvwxyz1234')).toBe('sk-••••••••••••••••1234');
  });

  it('shows sk-proj- prefix for project keys', () => {
    expect(formatMaskedApiKey('sk-proj-abcdefghijklmnopqrstuvwxyz9876')).toBe(
      'sk-proj-••••••••••••••••9876',
    );
  });

  it('shows generic prefix for keys without dashes', () => {
    expect(formatMaskedApiKey('mysecretapikeyvalue1234')).toBe('mys••••••••••••••••1234');
  });
});
