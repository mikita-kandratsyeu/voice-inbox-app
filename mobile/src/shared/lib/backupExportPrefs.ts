import { storage } from '@/shared/lib/async-storage';

const KEY_ENCRYPT_EXPORT = 'backup.encryptExportEnabled';
const KEY_ENCRYPTION_NOTICE_ACK = 'backup.encryptionNoticeAcknowledged';

export const getBackupEncryptExportEnabled = (): boolean =>
  storage.getBoolean(KEY_ENCRYPT_EXPORT) ?? false;

export const setBackupEncryptExportEnabled = (value: boolean): void => {
  storage.set(KEY_ENCRYPT_EXPORT, value);
};

export const getBackupEncryptionNoticeAcknowledged = (): boolean =>
  storage.getBoolean(KEY_ENCRYPTION_NOTICE_ACK) ?? false;

export const setBackupEncryptionNoticeAcknowledged = (): void => {
  storage.set(KEY_ENCRYPTION_NOTICE_ACK, true);
};
