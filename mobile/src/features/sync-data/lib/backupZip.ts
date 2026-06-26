/** WinZip AES-256 — matches `react-native-zip-archive` folder export and @zip.js on web. */
export const BACKUP_ZIP_ENCRYPTION = 'AES-256' as const;

export const BACKUP_PASSWORD_MIN_LENGTH = 8;

export type BackupPasswordValidationError = 'too_short' | 'mismatch';

export function validateBackupPassword(
  password: string,
  confirm?: string,
): BackupPasswordValidationError | null {
  const trimmed = password.trim();
  if (trimmed.length < BACKUP_PASSWORD_MIN_LENGTH) {
    return 'too_short';
  }
  if (confirm !== undefined && trimmed !== confirm.trim()) {
    return 'mismatch';
  }
  return null;
}
