const mockStorageState = new Map<string, string>();

jest.mock('@/shared/lib/async-storage/mmkv', () => ({
  storage: {
    getString: (key: string) => mockStorageState.get(key),
    set: (key: string, value: string) => {
      mockStorageState.set(key, value);
    },
  },
}));

import { buildLocalGraphFilters } from '../buildLocalGraphFilters';

describe('buildLocalGraphFilters', () => {
  beforeEach(() => {
    mockStorageState.clear();
  });

  it('shows tasks and contains edges like the global graph', () => {
    const filters = buildLocalGraphFilters();

    expect(filters.showTasks).toBe(true);
    expect(filters.showArchived).toBe(false);
    expect(filters.edgeVisibility.contains).toBe(true);
    expect(filters.edgeVisibility.linked).toBe(true);
    expect(filters.edgeVisibility.similar).toBe(true);
    expect(filters.nodeDisplayMode).toBe('cards');
  });
});
