import {
  buildSimplifiedGraphFilters,
  LARGE_GRAPH_SIMPLIFY_THRESHOLD,
  resolveGraphFilters,
  shouldAutoSimplifyGraph,
  simplifiedEdgeVisibility,
} from '../graphSimplifyMode';
import {
  DEFAULT_EDGE_VISIBILITY,
  DEFAULT_GRAPH_LAYOUT_MODE,
  type GraphFilters,
} from '../graphTypes';

const baseFilters: GraphFilters = {
  folderId: null,
  tags: ['work'],
  showTasks: true,
  showArchived: false,
  edgeVisibility: { ...DEFAULT_EDGE_VISIBILITY },
  layoutMode: DEFAULT_GRAPH_LAYOUT_MODE,
};

describe('shouldAutoSimplifyGraph', () => {
  it('enables simplify mode above the threshold', () => {
    expect(shouldAutoSimplifyGraph(LARGE_GRAPH_SIMPLIFY_THRESHOLD)).toBe(false);
    expect(shouldAutoSimplifyGraph(LARGE_GRAPH_SIMPLIFY_THRESHOLD + 1)).toBe(true);
  });
});

describe('buildSimplifiedGraphFilters', () => {
  it('hides tasks and folder/contains edges', () => {
    const simplified = buildSimplifiedGraphFilters(baseFilters);

    expect(simplified.showTasks).toBe(false);
    expect(simplified.edgeVisibility).toEqual({
      similar: true,
      sharedTag: true,
      sameFolder: false,
      contains: false,
    });
    expect(simplified.tags).toEqual(['work']);
  });
});

describe('resolveGraphFilters', () => {
  it('returns original filters when simplify is disabled', () => {
    expect(resolveGraphFilters(baseFilters, 200, false)).toBe(baseFilters);
    expect(resolveGraphFilters(baseFilters, 10, false)).toBe(baseFilters);
  });

  it('auto-simplifies large graphs when override is null', () => {
    const resolved = resolveGraphFilters(baseFilters, 200, null);

    expect(resolved.showTasks).toBe(false);
    expect(resolved.edgeVisibility.contains).toBe(false);
  });

  it('forces simplify when override is true', () => {
    const resolved = resolveGraphFilters(baseFilters, 10, true);

    expect(resolved.showTasks).toBe(false);
  });
});

describe('simplifiedEdgeVisibility', () => {
  it('keeps similarity and tag edges only', () => {
    expect(
      simplifiedEdgeVisibility({
        similar: false,
        sharedTag: true,
        sameFolder: true,
        contains: true,
      }),
    ).toEqual({
      similar: false,
      sharedTag: true,
      sameFolder: false,
      contains: false,
    });
  });
});
