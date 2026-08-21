import { isPublicHttpUrl } from './constants';

describe('isPublicHttpUrl', () => {
  it('accepts http and https URLs', () => {
    expect(isPublicHttpUrl('https://github.com/org/repo')).toBe(true);
    expect(isPublicHttpUrl('http://example.com')).toBe(true);
    expect(isPublicHttpUrl('  https://github.com/org/repo  ')).toBe(true);
  });

  it('rejects empty or non-http values', () => {
    expect(isPublicHttpUrl('')).toBe(false);
    expect(isPublicHttpUrl('   ')).toBe(false);
    expect(isPublicHttpUrl(undefined)).toBe(false);
    expect(isPublicHttpUrl('github.com/org/repo')).toBe(false);
    expect(isPublicHttpUrl('javascript:alert(1)')).toBe(false);
  });
});
