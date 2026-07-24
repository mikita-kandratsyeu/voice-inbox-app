import { storage } from '@/shared/lib/async-storage/mmkv';

const VISIBLE_STORAGE_KEY = 'notesGraph.folderHighlightsVisible';

export function getGraphFolderHighlightsVisible(): boolean {
  const raw = storage.getString(VISIBLE_STORAGE_KEY);
  if (raw == null) return true;
  return raw !== '0' && raw !== 'false';
}

export function setGraphFolderHighlightsVisible(visible: boolean): void {
  storage.set(VISIBLE_STORAGE_KEY, visible ? '1' : '0');
}
