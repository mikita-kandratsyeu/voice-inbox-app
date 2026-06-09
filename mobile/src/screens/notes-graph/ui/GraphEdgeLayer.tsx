import React, { useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';

import type { Colors } from '@/shared/config';

import {
  buildParallelEdgeBendLayout,
  computeEdgeCurvature,
  computeQuadraticEdgePath,
} from '../lib/graphEdgePath';
import { getGraphEdgeStrokeStyle } from '../lib/graphEdgeStyles';
import { nodeBorderAnchor, nodeCenter } from '../lib/graphNodeMetrics';
import type { GraphEdge, GraphEdgeKind, GraphNode } from '../lib/graphTypes';

const EDGE_DRAW_ORDER: Record<GraphEdgeKind, number> = {
  sameFolder: 0,
  sharedTag: 1,
  contains: 2,
  similar: 3,
};

type GraphEdgeLayerProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  color: Colors;
  width: number;
  height: number;
  matchedNodeIds: ReadonlySet<string> | null;
  activeNodeId: string | null;
};

function edgeIsDimmed(
  edge: GraphEdge,
  matchedNodeIds: ReadonlySet<string> | null,
  activeNodeId: string | null,
): boolean {
  if (!matchedNodeIds || matchedNodeIds.size === 0) return false;
  if (activeNodeId && (edge.sourceId === activeNodeId || edge.targetId === activeNodeId)) {
    return false;
  }
  return !matchedNodeIds.has(edge.sourceId) && !matchedNodeIds.has(edge.targetId);
}

export const GraphEdgeLayer = React.memo(function GraphEdgeLayer({
  nodes,
  edges,
  color,
  width,
  height,
  matchedNodeIds,
  activeNodeId,
}: GraphEdgeLayerProps) {
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const bendLayout = useMemo(() => buildParallelEdgeBendLayout(edges), [edges]);
  const sortedEdges = useMemo(
    () =>
      [...edges].sort((a, b) => {
        const orderDelta = EDGE_DRAW_ORDER[a.kind] - EDGE_DRAW_ORDER[b.kind];
        return orderDelta !== 0 ? orderDelta : a.id.localeCompare(b.id);
      }),
    [edges],
  );

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', left: 0, top: 0 }}
      pointerEvents="none"
    >
      {sortedEdges.map((edge) => {
        const source = nodeById.get(edge.sourceId);
        const target = nodeById.get(edge.targetId);
        if (!source || !target) return null;

        const targetCenter = nodeCenter(target);
        const sourceCenter = nodeCenter(source);
        const from = nodeBorderAnchor(source, targetCenter);
        const to = nodeBorderAnchor(target, sourceCenter);
        const style = getGraphEdgeStrokeStyle(edge.kind, color);
        const dimmed = edgeIsDimmed(edge, matchedNodeIds, activeNodeId);
        const bend = bendLayout.get(edge.id) ?? { index: 0, total: 1 };
        const distance = Math.hypot(to.x - from.x, to.y - from.y);
        const curvature = computeEdgeCurvature(distance, edge.id, bend);
        const path = computeQuadraticEdgePath(from, to, curvature);

        return (
          <Path
            key={edge.id}
            d={path}
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
            strokeDasharray={style.strokeDasharray}
            strokeLinecap={style.strokeLinecap ?? 'round'}
            opacity={dimmed ? style.opacity * 0.25 : style.opacity}
            fill="none"
          />
        );
      })}
    </Svg>
  );
});
