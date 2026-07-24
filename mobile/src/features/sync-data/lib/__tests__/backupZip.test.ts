import { BACKUP_PASSWORD_MIN_LENGTH, validateBackupPassword } from '../backupZip';

describe('validateBackupPassword', () => {
  it('rejects passwords shorter than minimum', () => {
    expect(validateBackupPassword('short')).toBe('too_short');
    expect(validateBackupPassword('   abc   ')).toBe('too_short');
  });

  it('accepts valid password without confirm', () => {
    const password = 'a'.repeat(BACKUP_PASSWORD_MIN_LENGTH);
    expect(validateBackupPassword(password)).toBeNull();
  });

  it('rejects mismatch when confirm is provided', () => {
    expect(validateBackupPassword('password1', 'password2')).toBe('mismatch');
    expect(validateBackupPassword('password1', 'password1')).toBeNull();
  });

  it('trims whitespace before validation', () => {
    expect(validateBackupPassword('  password1  ', 'password1')).toBeNull();
  });
});
