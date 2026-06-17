import { buildLocalGraphFilters } from '../buildLocalGraphFilters';

describe('buildLocalGraphFilters', () => {
  it('shows tasks and contains edges like the global graph', () => {
    const filters = buildLocalGraphFilters();

    expect(filters.showTasks).toBe(true);
    expect(filters.edgeVisibility.contains).toBe(true);
    expect(filters.edgeVisibility.linked).toBe(true);
    expect(filters.edgeVisibility.similar).toBe(true);
  });
});
