import type { GraphEdge, GraphEdgeKind } from './graphTypes';

const BASE_LAYOUT_EDGE_WEIGHTS: Record<GraphEdgeKind, number> = {
  contains: 4,
  similar: 3,
  linked: 3.5,
  sameFolder: 2,
  sharedTag: 1.4,
};

/** Layout force weight for a graph edge (ForceAtlas2). */
export function resolveLayoutEdgeWeight(edge: Pick<GraphEdge, 'kind' | 'weight'>): number {
  const base = BASE_LAYOUT_EDGE_WEIGHTS[edge.kind];
  if (edge.kind === 'similar' && edge.weight != null) {
    return base * edge.weight;
  }
  return base;
}

/** Maps a similarity score into a 0.6–1.4 multiplier for layout weight. */
export function similarEdgeLayoutWeight(score: number, minScore: number): number {
  const span = Math.max(0.01, 1 - minScore);
  const t = Math.max(0, Math.min(1, (score - minScore) / span));
  return 0.6 + t * 0.8;
}
