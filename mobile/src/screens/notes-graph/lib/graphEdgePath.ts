import type { GraphEdge, GraphEdgeKind } from './graphTypes';

export function edgeBendSign(edgeId: string): number {
  let hash = 0;
  for (let i = 0; i < edgeId.length; i++) {
    hash = (hash + edgeId.charCodeAt(i)) % 2;
  }
  return hash === 0 ? 1 : -1;
}

const PARALLEL_EDGE_KIND_ORDER: Record<GraphEdgeKind, number> = {
  sameFolder: 0,
  sharedTag: 1,
  contains: 2,
  similar: 3,
};

export type ParallelEdgeBend = {
  index: number;
  total: number;
};

/** Assigns a stable bend slot when multiple edges connect the same node pair. */
export function buildParallelEdgeBendLayout(edges: GraphEdge[]): Map<string, ParallelEdgeBend> {
  const pairGroups = new Map<string, GraphEdge[]>();

  for (const edge of edges) {
    const pairKey = [edge.sourceId, edge.targetId].sort().join('|');
    const group = pairGroups.get(pairKey) ?? [];
    group.push(edge);
    pairGroups.set(pairKey, group);
  }

  const layout = new Map<string, ParallelEdgeBend>();

  for (const group of pairGroups.values()) {
    const sorted = [...group].sort((a, b) => {
      const kindDelta = PARALLEL_EDGE_KIND_ORDER[a.kind] - PARALLEL_EDGE_KIND_ORDER[b.kind];
      return kindDelta !== 0 ? kindDelta : a.id.localeCompare(b.id);
    });

    sorted.forEach((edge, index) => {
      layout.set(edge.id, { index, total: sorted.length });
    });
  }

  return layout;
}

function edgeCurvatureFactor(kind: GraphEdgeKind): number {
  switch (kind) {
    case 'contains':
      return 0.12;
    case 'sameFolder':
      return 0.55;
    case 'sharedTag':
      return 0.82;
    case 'similar':
    default:
      return 1;
  }
}

export function computeEdgeCurvature(
  distance: number,
  edgeId: string,
  bend: ParallelEdgeBend,
  kind: GraphEdgeKind = 'similar',
): number {
  const straightness = edgeCurvatureFactor(kind);
  const base = Math.min(64, Math.max(16, distance * 0.22)) * straightness;

  if (bend.total <= 1) {
    return base * edgeBendSign(edgeId);
  }

  const spreadIndex = bend.index - (bend.total - 1) / 2;
  if (spreadIndex === 0) {
    return base * 0.2 * edgeBendSign(edgeId);
  }

  return base * spreadIndex * 1.2;
}

export function computeQuadraticEdgePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  curvature: number,
): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }

  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const normalX = -dy / distance;
  const normalY = dx / distance;
  const controlX = midX + normalX * curvature;
  const controlY = midY + normalY * curvature;

  return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
}
