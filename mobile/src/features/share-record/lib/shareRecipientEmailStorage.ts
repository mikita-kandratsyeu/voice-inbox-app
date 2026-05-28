import { storage } from '@/shared/lib/async-storage/mmkv';

const LAST_SHARE_RECIPIENT_EMAIL_KEY = 'share.lastRecipientEmail';

export function getLastShareRecipientEmail(): string | null {
  const value = storage.getString(LAST_SHARE_RECIPIENT_EMAIL_KEY)?.trim() ?? '';
  return value.length > 0 ? value : null;
}

export function saveLastShareRecipientEmail(email: string): void {
  const trimmed = email.trim();
  if (!trimmed) return;
  storage.set(LAST_SHARE_RECIPIENT_EMAIL_KEY, trimmed);
}

export function clearLastShareRecipientEmail(): void {
  storage.remove(LAST_SHARE_RECIPIENT_EMAIL_KEY);
}
