import { storage } from '@/shared/lib/async-storage/mmkv';

const INCLUDE_ARCHIVED_STORAGE_KEY = 'inboxAsk.includeArchived';
const FOLDER_ID_STORAGE_KEY = 'inboxAsk.folderId';

export function getInboxAskIncludeArchived(): boolean {
  const raw = storage.getString(INCLUDE_ARCHIVED_STORAGE_KEY);
  if (raw == null) return false;
  return raw !== '0' && raw !== 'false';
}

export function setInboxAskIncludeArchived(includeArchived: boolean): void {
  storage.set(INCLUDE_ARCHIVED_STORAGE_KEY, includeArchived ? '1' : '0');
}

export function getInboxAskFolderId(): string | null {
  const raw = storage.getString(FOLDER_ID_STORAGE_KEY);
  if (raw == null || raw === '') return null;
  return raw;
}

export function setInboxAskFolderId(folderId: string | null): void {
  storage.set(FOLDER_ID_STORAGE_KEY, folderId ?? '');
}
