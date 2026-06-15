import {
  buildParallelEdgeBendLayout,
  computeCubicEdgePath,
  computeEdgeCurvature,
  computeQuadraticEdgePath,
} from './graphEdgePath';
import { type GraphEdgeEmphasis, resolveGraphEdgeEmphasis } from './graphEdgeStyles';
import { nodeBorderAnchor, nodeCenter } from './graphNodeMetrics';
import type { GraphEdge, GraphEdgeKind, GraphNode } from './graphTypes';

const EDGE_KIND_DRAW_ORDER: Record<GraphEdgeKind, number> = {
  sameFolder: 0,
  sharedTag: 1,
  contains: 2,
  linked: 3,
  similar: 4,
};

const EDGE_EMPHASIS_DRAW_ORDER: Record<GraphEdgeEmphasis, number> = {
  dimmed: 0,
  default: 1,
  highlighted: 2,
};

export type GraphRenderedEdge = {
  edge: GraphEdge;
  path: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  emphasis: GraphEdgeEmphasis;
  shouldAnimate: boolean;
};

export type GraphViewportCull = {
  translateX: number;
  translateY: number;
  scale: number;
  viewportWidth: number;
  viewportHeight: number;
};

const VIEWPORT_CULL_BASE_PADDING = 160;

export function computeGraphVisibleWorldRect(
  cull: GraphViewportCull,
  padding = VIEWPORT_CULL_BASE_PADDING,
) {
  const { translateX, translateY, scale, viewportWidth, viewportHeight } = cull;
  const safeScale = Math.max(scale, 0.01);
  const dynamicPadding = Math.max(padding, viewportWidth / safeScale, viewportHeight / safeScale);

  return {
    left: -translateX / safeScale - dynamicPadding,
    top: -translateY / safeScale - dynamicPadding,
    right: (-translateX + viewportWidth) / safeScale + dynamicPadding,
    bottom: (-translateY + viewportHeight) / safeScale + dynamicPadding,
  };
}

function segmentIntersectsRect(
  from: { x: number; y: number },
  to: { x: number; y: number },
  rect: { left: number; top: number; right: number; bottom: number },
): boolean {
  if (
    (from.x >= rect.left && from.x <= rect.right && from.y >= rect.top && from.y <= rect.bottom) ||
    (to.x >= rect.left && to.x <= rect.right && to.y >= rect.top && to.y <= rect.bottom)
  ) {
    return true;
  }

  const minX = Math.min(from.x, to.x);
  const maxX = Math.max(from.x, to.x);
  const minY = Math.min(from.y, to.y);
  const maxY = Math.max(from.y, to.y);

  return !(maxX < rect.left || minX > rect.right || maxY < rect.top || minY > rect.bottom);
}

export function buildGraphRenderedEdges(
  nodes: GraphNode[],
  edges: GraphEdge[],
  matchedNodeIds: ReadonlySet<string> | null,
  activeNodeId: string | null,
  viewportCull?: GraphViewportCull | null,
): GraphRenderedEdge[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const nodeCenters = new Map<string, { x: number; y: number }>();

  for (const node of nodes) {
    nodeCenters.set(node.id, nodeCenter(node));
  }

  const bendLayout = buildParallelEdgeBendLayout(edges);
  const visibleRect = viewportCull ? computeGraphVisibleWorldRect(viewportCull) : null;
  const items: GraphRenderedEdge[] = [];

  for (const edge of edges) {
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    if (!source || !target) continue;

    const sourceCenter = nodeCenters.get(edge.sourceId)!;
    const targetCenter = nodeCenters.get(edge.targetId)!;
    const from = nodeBorderAnchor(source, targetCenter);
    const to = nodeBorderAnchor(target, sourceCenter);

    if (visibleRect && !segmentIntersectsRect(from, to, visibleRect)) {
      continue;
    }

    const bend = bendLayout.get(edge.id) ?? { index: 0, total: 1 };
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const curvature = computeEdgeCurvature(distance, edge.id, bend, edge.kind);

    const useCubic = edge.kind === 'similar' || edge.kind === 'contains';
    const path = useCubic
      ? computeCubicEdgePath(from, to, curvature)
      : computeQuadraticEdgePath(from, to, curvature);

    const emphasis = resolveGraphEdgeEmphasis(edge, matchedNodeIds, activeNodeId);
    const shouldAnimate =
      emphasis === 'highlighted' && (edge.kind === 'similar' || edge.kind === 'contains');

    items.push({ edge, path, from, to, emphasis, shouldAnimate });
  }

  items.sort((a, b) => {
    const emphasisDelta =
      EDGE_EMPHASIS_DRAW_ORDER[a.emphasis] - EDGE_EMPHASIS_DRAW_ORDER[b.emphasis];
    if (emphasisDelta !== 0) return emphasisDelta;

    const kindDelta = EDGE_KIND_DRAW_ORDER[a.edge.kind] - EDGE_KIND_DRAW_ORDER[b.edge.kind];
    return kindDelta !== 0 ? kindDelta : a.edge.id.localeCompare(b.edge.id);
  });

  return items;
}
