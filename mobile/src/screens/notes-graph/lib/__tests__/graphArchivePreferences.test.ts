import { getGraphShowArchived, setGraphShowArchived } from '../graphArchivePreferences';

const mockStorageState = new Map<string, string>();

jest.mock('@/shared/lib/async-storage/mmkv', () => ({
  storage: {
    getString: (key: string) => mockStorageState.get(key),
    set: (key: string, value: string) => {
      mockStorageState.set(key, value);
    },
  },
}));

describe('graph archive preferences storage', () => {
  beforeEach(() => {
    mockStorageState.clear();
  });

  it('defaults archive visibility to off', () => {
    expect(getGraphShowArchived()).toBe(false);
  });

  it('persists archive visibility', () => {
    setGraphShowArchived(true);
    expect(getGraphShowArchived()).toBe(true);

    setGraphShowArchived(false);
    expect(getGraphShowArchived()).toBe(false);
  });
});
