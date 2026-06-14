import type { GraphEdgeVisibility, GraphFilters } from './graphTypes';

export const LARGE_GRAPH_SIMPLIFY_THRESHOLD = 150;

export function shouldAutoSimplifyGraph(recordCount: number): boolean {
  return recordCount > LARGE_GRAPH_SIMPLIFY_THRESHOLD;
}

export function buildSimplifiedGraphFilters(filters: GraphFilters): GraphFilters {
  return {
    ...filters,
    showTasks: false,
    edgeVisibility: {
      similar: filters.edgeVisibility.similar,
      sharedTag: filters.edgeVisibility.sharedTag,
      sameFolder: false,
      contains: false,
      linked: filters.edgeVisibility.linked,
    },
  };
}

export function resolveGraphFilters(
  filters: GraphFilters,
  recordCount: number,
  simplifyMode: boolean | null,
): GraphFilters {
  const auto = shouldAutoSimplifyGraph(recordCount);
  const enabled = simplifyMode ?? auto;
  if (!enabled) return filters;
  return buildSimplifiedGraphFilters(filters);
}

export function simplifiedEdgeVisibility(base: GraphEdgeVisibility): GraphEdgeVisibility {
  return {
    similar: base.similar,
    sharedTag: base.sharedTag,
    sameFolder: false,
    contains: false,
    linked: base.linked,
  };
}
