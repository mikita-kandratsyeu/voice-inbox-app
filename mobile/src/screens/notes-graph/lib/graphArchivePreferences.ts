import { storage } from '@/shared/lib/async-storage/mmkv';

const SHOW_ARCHIVED_STORAGE_KEY = 'notesGraph.showArchived';

export function getGraphShowArchived(): boolean {
  const raw = storage.getString(SHOW_ARCHIVED_STORAGE_KEY);
  if (raw == null) return false;
  return raw !== '0' && raw !== 'false';
}

export function setGraphShowArchived(showArchived: boolean): void {
  storage.set(SHOW_ARCHIVED_STORAGE_KEY, showArchived ? '1' : '0');
}
