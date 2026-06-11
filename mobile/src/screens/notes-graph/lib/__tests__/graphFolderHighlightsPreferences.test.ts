import {
  getGraphFolderHighlightsVisible,
  setGraphFolderHighlightsVisible,
} from '../graphFolderHighlightsPreferences';

const mockStorageState = new Map<string, string>();

jest.mock('@/shared/lib/async-storage/mmkv', () => ({
  storage: {
    getString: (key: string) => mockStorageState.get(key),
    set: (key: string, value: string) => {
      mockStorageState.set(key, value);
    },
  },
}));

describe('graph folder highlights preferences storage', () => {
  beforeEach(() => {
    mockStorageState.clear();
  });

  it('defaults folder highlights visibility to on', () => {
    expect(getGraphFolderHighlightsVisible()).toBe(true);
  });

  it('persists folder highlights visibility', () => {
    setGraphFolderHighlightsVisible(false);
    expect(getGraphFolderHighlightsVisible()).toBe(false);

    setGraphFolderHighlightsVisible(true);
    expect(getGraphFolderHighlightsVisible()).toBe(true);
  });
});
