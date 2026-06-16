const mockStorageState = new Map<string, string>();

jest.mock('@/shared/lib/async-storage/mmkv', () => ({
  storage: {
    getString: (key: string) => mockStorageState.get(key),
    set: (key: string, value: string) => {
      mockStorageState.set(key, value);
    },
  },
}));

import {
  clampGraphMinimapSize,
  getGraphMinimapPresetSize,
  GRAPH_MINIMAP_MAX_HEIGHT,
  GRAPH_MINIMAP_MAX_WIDTH,
  GRAPH_MINIMAP_MIN_HEIGHT,
  GRAPH_MINIMAP_MIN_WIDTH,
  resolveGraphMinimapPreset,
  resolveGraphMinimapResizeLimits,
} from '../graphMinimapPreferences';

describe('getGraphMinimapPresetSize', () => {
  it('returns small, medium, and large bounds', () => {
    expect(getGraphMinimapPresetSize('small')).toEqual({
      width: GRAPH_MINIMAP_MIN_WIDTH,
      height: GRAPH_MINIMAP_MIN_HEIGHT,
    });
    expect(getGraphMinimapPresetSize('large')).toEqual({
      width: GRAPH_MINIMAP_MAX_WIDTH,
      height: GRAPH_MINIMAP_MAX_HEIGHT,
    });
  });
});

describe('resolveGraphMinimapPreset', () => {
  it('maps stored sizes to the nearest preset', () => {
    expect(resolveGraphMinimapPreset(getGraphMinimapPresetSize('small'))).toBe('small');
    expect(resolveGraphMinimapPreset(getGraphMinimapPresetSize('large'))).toBe('large');
    expect(resolveGraphMinimapPreset(getGraphMinimapPresetSize('medium'))).toBe('medium');
  });
});

describe('resolveGraphMinimapResizeLimits', () => {
  it('detects min and max edges before clamping', () => {
    expect(resolveGraphMinimapResizeLimits(40, 500)).toEqual({
      width: 'min',
      height: 'max',
    });
    expect(resolveGraphMinimapResizeLimits(999, 999)).toEqual({
      width: 'max',
      height: 'max',
    });
    expect(resolveGraphMinimapResizeLimits(120, 90)).toEqual({
      width: null,
      height: null,
    });
  });

  it('clamps to the same limits', () => {
    expect(clampGraphMinimapSize(40, 500)).toEqual({
      width: GRAPH_MINIMAP_MIN_WIDTH,
      height: GRAPH_MINIMAP_MAX_HEIGHT,
    });
  });
});
