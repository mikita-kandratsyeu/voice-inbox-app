import { storage } from '@/shared/lib/async-storage/mmkv';

const SIZE_STORAGE_KEY = 'notesGraph.minimapSize';
const VISIBLE_STORAGE_KEY = 'notesGraph.minimapVisible';

export const GRAPH_MINIMAP_MIN_NODE_COUNT = 12;

export function isGraphMinimapAvailable(nodeCount: number): boolean {
  return nodeCount >= GRAPH_MINIMAP_MIN_NODE_COUNT;
}

export const GRAPH_MINIMAP_DEFAULT_WIDTH = 104;
export const GRAPH_MINIMAP_DEFAULT_HEIGHT = 72;
export const GRAPH_MINIMAP_MIN_WIDTH = 80;
export const GRAPH_MINIMAP_MIN_HEIGHT = 56;
export const GRAPH_MINIMAP_MAX_WIDTH = 224;
export const GRAPH_MINIMAP_MAX_HEIGHT = 144;

export type GraphMinimapSize = {
  width: number;
  height: number;
};

export type GraphMinimapSizePreset = 'small' | 'medium' | 'large';

export const GRAPH_MINIMAP_PRESET_SIZES: Record<GraphMinimapSizePreset, GraphMinimapSize> = {
  small: {
    width: GRAPH_MINIMAP_MIN_WIDTH,
    height: GRAPH_MINIMAP_MIN_HEIGHT,
  },
  medium: {
    width: GRAPH_MINIMAP_DEFAULT_WIDTH,
    height: GRAPH_MINIMAP_DEFAULT_HEIGHT,
  },
  large: {
    width: GRAPH_MINIMAP_MAX_WIDTH,
    height: GRAPH_MINIMAP_MAX_HEIGHT,
  },
};

export function getGraphMinimapPresetSize(preset: GraphMinimapSizePreset): GraphMinimapSize {
  return GRAPH_MINIMAP_PRESET_SIZES[preset];
}

export function resolveGraphMinimapPreset(size: GraphMinimapSize): GraphMinimapSizePreset {
  const presets = Object.entries(GRAPH_MINIMAP_PRESET_SIZES) as [
    GraphMinimapSizePreset,
    GraphMinimapSize,
  ][];

  let best: GraphMinimapSizePreset = 'medium';
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const [preset, candidate] of presets) {
    const distance =
      Math.abs(candidate.width - size.width) + Math.abs(candidate.height - size.height);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = preset;
    }
  }

  return best;
}

export type GraphMinimapResizeLimit = 'min' | 'max';

export function resolveGraphMinimapResizeLimits(
  nextWidth: number,
  nextHeight: number,
): { width: GraphMinimapResizeLimit | null; height: GraphMinimapResizeLimit | null } {
  return {
    width:
      nextWidth <= GRAPH_MINIMAP_MIN_WIDTH
        ? 'min'
        : nextWidth >= GRAPH_MINIMAP_MAX_WIDTH
          ? 'max'
          : null,
    height:
      nextHeight <= GRAPH_MINIMAP_MIN_HEIGHT
        ? 'min'
        : nextHeight >= GRAPH_MINIMAP_MAX_HEIGHT
          ? 'max'
          : null,
  };
}

export function clampGraphMinimapSize(width: number, height: number): GraphMinimapSize {
  return {
    width: Math.min(GRAPH_MINIMAP_MAX_WIDTH, Math.max(GRAPH_MINIMAP_MIN_WIDTH, Math.round(width))),
    height: Math.min(
      GRAPH_MINIMAP_MAX_HEIGHT,
      Math.max(GRAPH_MINIMAP_MIN_HEIGHT, Math.round(height)),
    ),
  };
}

export function getGraphMinimapVisible(): boolean {
  const raw = storage.getString(VISIBLE_STORAGE_KEY);
  if (raw == null) return true;
  return raw !== '0' && raw !== 'false';
}

export function setGraphMinimapVisible(visible: boolean): void {
  storage.set(VISIBLE_STORAGE_KEY, visible ? '1' : '0');
}

export function getGraphMinimapSize(): GraphMinimapSize {
  const raw = storage.getString(SIZE_STORAGE_KEY);
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
  storage.set(SIZE_STORAGE_KEY, JSON.stringify(clampGraphMinimapSize(size.width, size.height)));
}
