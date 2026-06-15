import React, { useMemo } from 'react';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import type { Colors } from '@/shared/config';

import {
  buildParallelEdgeBendLayout,
  computeCubicEdgePath,
  computeEdgeCurvature,
  computeQuadraticEdgePath,
} from '../lib/graphEdgePath';
import {
  getGraphEdgeGlowStyle,
  getGraphEdgeStrokeStyle,
  type GraphEdgeEmphasis,
  resolveGraphEdgeEmphasis,
} from '../lib/graphEdgeStyles';
import { nodeBorderAnchor, nodeCenter } from '../lib/graphNodeMetrics';
import type { GraphEdge, GraphEdgeKind, GraphNode } from '../lib/graphTypes';

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

type GraphEdgeLayerProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  color: Colors;
  width: number;
  height: number;
  matchedNodeIds: ReadonlySet<string> | null;
  activeNodeId: string | null;
};

type RenderedEdge = {
  edge: GraphEdge;
  path: string;
  emphasis: GraphEdgeEmphasis;
  shouldAnimate: boolean;
};

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

  const edgePaths = useMemo(() => {
    const pathsMap = new Map<string, string>();

    for (const edge of edges) {
      const source = nodeById.get(edge.sourceId);
      const target = nodeById.get(edge.targetId);
      if (!source || !target) continue;

      const targetCenter = nodeCenter(target);
      const sourceCenter = nodeCenter(source);
      const from = nodeBorderAnchor(source, targetCenter);
      const to = nodeBorderAnchor(target, sourceCenter);
      const bend = bendLayout.get(edge.id) ?? { index: 0, total: 1 };
      const distance = Math.hypot(to.x - from.x, to.y - from.y);
      const curvature = computeEdgeCurvature(distance, edge.id, bend, edge.kind);

      const useCubic = edge.kind === 'similar' || edge.kind === 'contains';
      const path = useCubic
        ? computeCubicEdgePath(from, to, curvature)
        : computeQuadraticEdgePath(from, to, curvature);

      pathsMap.set(edge.id, path);
    }

    return pathsMap;
  }, [bendLayout, edges, nodeById]);

  const edgeEmphases = useMemo(() => {
    const emphases = new Map<string, GraphEdgeEmphasis>();
    for (const edge of edges) {
      emphases.set(edge.id, resolveGraphEdgeEmphasis(edge, matchedNodeIds, activeNodeId));
    }
    return emphases;
  }, [edges, matchedNodeIds, activeNodeId]);

  const renderedEdges = useMemo(() => {
    const items: RenderedEdge[] = [];

    for (const edge of edges) {
      const path = edgePaths.get(edge.id);
      if (!path) continue;

      const emphasis = edgeEmphases.get(edge.id) ?? 'default';
      const shouldAnimate =
        emphasis === 'highlighted' && (edge.kind === 'similar' || edge.kind === 'contains');

      items.push({ edge, path, emphasis, shouldAnimate });
    }

    items.sort((a, b) => {
      const emphasisDelta =
        EDGE_EMPHASIS_DRAW_ORDER[a.emphasis] - EDGE_EMPHASIS_DRAW_ORDER[b.emphasis];
      if (emphasisDelta !== 0) return emphasisDelta;

      const kindDelta = EDGE_KIND_DRAW_ORDER[a.edge.kind] - EDGE_KIND_DRAW_ORDER[b.edge.kind];
      return kindDelta !== 0 ? kindDelta : a.edge.id.localeCompare(b.edge.id);
    });

    return items;
  }, [edgeEmphases, edgePaths, edges]);

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', left: 0, top: 0 }}
      pointerEvents="none"
    >
      <Defs>
        {renderedEdges.map(({ edge }) => {
          const style = getGraphEdgeStrokeStyle(edge.kind, color, 'default');
          if (style.strokeGradient) {
            return (
              <LinearGradient
                key={style.strokeGradient.id + edge.id}
                id={`${style.strokeGradient.id}-${edge.id}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                {style.strokeGradient.colors.map((c, i) => (
                  <Stop
                    key={i}
                    offset={`${(i * 100) / (style.strokeGradient!.colors.length - 1)}%`}
                    stopColor={c}
                  />
                ))}
              </LinearGradient>
            );
          }
          return null;
        })}
      </Defs>
      {renderedEdges.map(({ edge, path, emphasis }) => {
        const style = getGraphEdgeStrokeStyle(edge.kind, color, emphasis);
        const glow = emphasis === 'highlighted' ? getGraphEdgeGlowStyle(edge.kind, color) : null;
        const useGradient = style.strokeGradient && emphasis !== 'dimmed';

        return (
          <React.Fragment key={edge.id}>
            {glow ? (
              <Path
                d={path}
                stroke={glow.stroke}
                strokeWidth={glow.strokeWidth}
                strokeLinecap={glow.strokeLinecap ?? 'round'}
                opacity={glow.opacity}
                fill="none"
              />
            ) : null}
            <Path
              d={path}
              stroke={useGradient ? `url(#${style.strokeGradient!.id}-${edge.id})` : style.stroke}
              strokeWidth={style.strokeWidth}
              strokeDasharray={style.strokeDasharray}
              strokeLinecap={style.strokeLinecap ?? 'round'}
              opacity={style.opacity}
              fill="none"
            />
          </React.Fragment>
        );
      })}
    </Svg>
  );
});
