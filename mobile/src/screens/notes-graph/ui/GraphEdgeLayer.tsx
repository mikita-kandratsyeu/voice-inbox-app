import React, { useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';

import type { Colors } from '@/shared/config';

import { getGraphEdgeStrokeStyle } from '../lib/graphEdgeStyles';
import { computeQuadraticEdgePath, edgeBendSign } from '../lib/graphEdgePath';
import type { GraphEdge, GraphNode } from '../lib/graphTypes';
import { nodeCenter } from '../lib/graphNodeMetrics';

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

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', left: 0, top: 0 }}
      pointerEvents="none"
    >
      {edges.map((edge) => {
        const source = nodeById.get(edge.sourceId);
        const target = nodeById.get(edge.targetId);
        if (!source || !target) return null;

        const from = nodeCenter(source);
        const to = nodeCenter(target);
        const style = getGraphEdgeStrokeStyle(edge.kind, color);
        const dimmed = edgeIsDimmed(edge, matchedNodeIds, activeNodeId);
        const path = computeQuadraticEdgePath(from, to, edgeBendSign(edge.id));

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
