import { storage } from '@/shared/lib/async-storage/mmkv';

const STORAGE_KEY = 'notesGraph.minimapSize';

export const GRAPH_MINIMAP_DEFAULT_WIDTH = 104;
export const GRAPH_MINIMAP_DEFAULT_HEIGHT = 72;
export const GRAPH_MINIMAP_MIN_WIDTH = 80;
export const GRAPH_MINIMAP_MIN_HEIGHT = 56;
export const GRAPH_MINIMAP_MAX_WIDTH = 200;
export const GRAPH_MINIMAP_MAX_HEIGHT = 144;

export type GraphMinimapSize = {
  width: number;
  height: number;
};

export function clampGraphMinimapSize(width: number, height: number): GraphMinimapSize {
  return {
    width: Math.min(GRAPH_MINIMAP_MAX_WIDTH, Math.max(GRAPH_MINIMAP_MIN_WIDTH, Math.round(width))),
    height: Math.min(
      GRAPH_MINIMAP_MAX_HEIGHT,
      Math.max(GRAPH_MINIMAP_MIN_HEIGHT, Math.round(height)),
    ),
  };
}

export function getGraphMinimapSize(): GraphMinimapSize {
  const raw = storage.getString(STORAGE_KEY);
  if (!raw) {
    return {
      width: GRAPH_MINIMAP_DEFAULT_WIDTH,
      height: GRAPH_MINIMAP_DEFAULT_HEIGHT,
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<GraphMinimapSize>;
    if (typeof parsed.width !== 'number' || typeof parsed.height !== 'number') {
      return {
        width: GRAPH_MINIMAP_DEFAULT_WIDTH,
        height: GRAPH_MINIMAP_DEFAULT_HEIGHT,
      };
    }
    return clampGraphMinimapSize(parsed.width, parsed.height);
  } catch {
    return {
      width: GRAPH_MINIMAP_DEFAULT_WIDTH,
      height: GRAPH_MINIMAP_DEFAULT_HEIGHT,
    };
  }
}

export function setGraphMinimapSize(size: GraphMinimapSize): void {
  storage.set(STORAGE_KEY, JSON.stringify(clampGraphMinimapSize(size.width, size.height)));
}
