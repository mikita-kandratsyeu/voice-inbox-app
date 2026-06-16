import { storage } from '@/shared/lib/async-storage/mmkv';

export type GraphNodeDisplayMode = 'cards' | 'dots';

const DISPLAY_MODE_STORAGE_KEY = 'notesGraph.nodeDisplayMode';

export function getGraphNodeDisplayMode(): GraphNodeDisplayMode {
  const raw = storage.getString(DISPLAY_MODE_STORAGE_KEY);
  if (raw === 'dots') return 'dots';
  return 'cards';
}

export function setGraphNodeDisplayMode(mode: GraphNodeDisplayMode): void {
  storage.set(DISPLAY_MODE_STORAGE_KEY, mode);
}
