import {
  hashLicenseKey,
  isValidLicenseKeyFormat,
  normalizeLicenseKeyInput,
} from './pro-license-crypto';

describe('pro-license-crypto', () => {
  it('normalizeLicenseKeyInput trims, uppercases, and strips separators', () => {
    expect(normalizeLicenseKeyInput('  vi-ab12-cd34-ef56  ')).toBe('VIAB12CD34EF56');
    expect(normalizeLicenseKeyInput('vi_ab12.cd34_ef56')).toBe('VIAB12CD34EF56');
  });

  it('isValidLicenseKeyFormat accepts normalized VI keys', () => {
    expect(isValidLicenseKeyFormat('VI-AB23-CD45-EF67')).toBe(true);
    expect(isValidLicenseKeyFormat('VI-AB10-CD34-EF56')).toBe(false);
    expect(isValidLicenseKeyFormat('VI-AB23-CD45-EF6')).toBe(false);
  });

  it('hashLicenseKey is deterministic with optional pepper', () => {
    const normalized = 'VIAB23CD45EF67';
    expect(hashLicenseKey(normalized)).toBe(hashLicenseKey(normalized));
    expect(hashLicenseKey(normalized)).not.toBe(hashLicenseKey(normalized, 'pepper'));
  });
});
