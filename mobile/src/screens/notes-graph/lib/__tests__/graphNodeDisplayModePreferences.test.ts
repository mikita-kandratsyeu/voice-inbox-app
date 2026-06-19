import {
  getGraphNodeDisplayMode,
  setGraphNodeDisplayMode,
} from '../graphNodeDisplayModePreferences';

const mockStorageState = new Map<string, string>();

jest.mock('@/shared/lib/async-storage/mmkv', () => ({
  storage: {
    getString: (key: string) => mockStorageState.get(key),
    set: (key: string, value: string) => {
      mockStorageState.set(key, value);
    },
  },
}));

describe('graph node display mode preferences storage', () => {
  beforeEach(() => {
    mockStorageState.clear();
  });

  it('defaults node display mode to cards', () => {
    expect(getGraphNodeDisplayMode()).toBe('cards');
  });

  it('treats unknown stored values as cards', () => {
    mockStorageState.set('notesGraph.nodeDisplayMode', 'invalid');
    expect(getGraphNodeDisplayMode()).toBe('cards');
  });

  it('persists node display mode', () => {
    setGraphNodeDisplayMode('dots');
    expect(getGraphNodeDisplayMode()).toBe('dots');

    setGraphNodeDisplayMode('cards');
    expect(getGraphNodeDisplayMode()).toBe('cards');
  });
});
