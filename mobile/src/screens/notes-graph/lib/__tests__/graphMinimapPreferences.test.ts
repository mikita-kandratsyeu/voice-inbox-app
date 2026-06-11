import {
  clampGraphMinimapSize,
  getGraphMinimapSize,
  getGraphMinimapVisible,
  GRAPH_MINIMAP_DEFAULT_HEIGHT,
  GRAPH_MINIMAP_DEFAULT_WIDTH,
  GRAPH_MINIMAP_MAX_HEIGHT,
  GRAPH_MINIMAP_MAX_WIDTH,
  GRAPH_MINIMAP_MIN_HEIGHT,
  GRAPH_MINIMAP_MIN_WIDTH,
  setGraphMinimapSize,
  setGraphMinimapVisible,
} from '../graphMinimapPreferences';

const mockStorageState = new Map<string, string>();

jest.mock('@/shared/lib/async-storage/mmkv', () => ({
  storage: {
    getString: (key: string) => mockStorageState.get(key),
    set: (key: string, value: string) => {
      mockStorageState.set(key, value);
    },
  },
}));

describe('clampGraphMinimapSize', () => {
  it('clamps and rounds width and height', () => {
    expect(clampGraphMinimapSize(40, 500)).toEqual({
      width: GRAPH_MINIMAP_MIN_WIDTH,
      height: GRAPH_MINIMAP_MAX_HEIGHT,
    });
    expect(clampGraphMinimapSize(999, 999)).toEqual({
      width: GRAPH_MINIMAP_MAX_WIDTH,
      height: GRAPH_MINIMAP_MAX_HEIGHT,
    });
  });
});

describe('graph minimap preferences storage', () => {
  beforeEach(() => {
    mockStorageState.clear();
  });

  it('returns defaults when storage is empty', () => {
    expect(getGraphMinimapSize()).toEqual({
      width: GRAPH_MINIMAP_DEFAULT_WIDTH,
      height: GRAPH_MINIMAP_DEFAULT_HEIGHT,
    });
  });

  it('persists clamped size values', () => {
    setGraphMinimapSize({ width: 250, height: 30 });

    expect(getGraphMinimapSize()).toEqual({
      width: GRAPH_MINIMAP_MAX_WIDTH,
      height: GRAPH_MINIMAP_MIN_HEIGHT,
    });
  });

  it('falls back to defaults for invalid stored JSON', () => {
    mockStorageState.set('notesGraph.minimapSize', '{not-json');

    expect(getGraphMinimapSize()).toEqual({
      width: GRAPH_MINIMAP_DEFAULT_WIDTH,
      height: GRAPH_MINIMAP_DEFAULT_HEIGHT,
    });
  });

  it('defaults minimap visibility to on', () => {
    expect(getGraphMinimapVisible()).toBe(true);
  });

  it('persists minimap visibility', () => {
    setGraphMinimapVisible(false);
    expect(getGraphMinimapVisible()).toBe(false);

    setGraphMinimapVisible(true);
    expect(getGraphMinimapVisible()).toBe(true);
  });
});
