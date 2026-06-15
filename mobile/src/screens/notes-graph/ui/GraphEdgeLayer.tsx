import type { SkPath } from '@shopify/react-native-skia';
import {
  Canvas,
  DashPathEffect,
  Group,
  LinearGradient,
  Path,
  vec,
} from '@shopify/react-native-skia';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Colors } from '@/shared/config';

import { buildGraphRenderedEdges, type GraphViewportCull } from '../lib/buildGraphRenderedEdges';
import { getGraphEdgeGlowStyle, getGraphEdgeStrokeStyle } from '../lib/graphEdgeStyles';
import { getCachedSkiaPath } from '../lib/graphSkiaUtils';
import { parseStrokeDashIntervals } from '../lib/graphStrokeDash';
import type { GraphEdge, GraphNode } from '../lib/graphTypes';

type GraphEdgeLayerProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  color: Colors;
  width: number;
  height: number;
  matchedNodeIds: ReadonlySet<string> | null;
  activeNodeId: string | null;
  viewportCull?: GraphViewportCull | null;
};

type PreparedEdgePath = {
  edgeId: string;
  path: SkPath;
  glow: ReturnType<typeof getGraphEdgeGlowStyle>;
  style: ReturnType<typeof getGraphEdgeStrokeStyle>;
  from: { x: number; y: number };
  to: { x: number; y: number };
  useGradient: boolean;
};

function prepareEdgePaths(
  renderedEdges: ReturnType<typeof buildGraphRenderedEdges>,
  color: Colors,
): PreparedEdgePath[] {
  const items: PreparedEdgePath[] = [];

  for (const { edge, path, from, to, emphasis } of renderedEdges) {
    const skiaPath = getCachedSkiaPath(`${edge.id}:${path}`, path);
    if (!skiaPath) continue;

    const style = getGraphEdgeStrokeStyle(edge.kind, color, emphasis);
    const glow = emphasis === 'highlighted' ? getGraphEdgeGlowStyle(edge.kind, color) : null;
    const useGradient = Boolean(style.strokeGradient && emphasis !== 'dimmed');

    items.push({
      edgeId: edge.id,
      path: skiaPath,
      glow,
      style,
      from,
      to,
      useGradient,
    });
  }

  return items;
}

function GraphEdgeStroke({ prepared }: { prepared: PreparedEdgePath }) {
  const dashIntervals = parseStrokeDashIntervals(prepared.style.strokeDasharray);
  const strokeCap = prepared.style.strokeLinecap ?? 'round';

  return (
    <Path
      path={prepared.path}
      style="stroke"
      strokeWidth={prepared.style.strokeWidth}
      color={prepared.useGradient ? undefined : prepared.style.stroke}
      opacity={prepared.style.opacity}
      strokeCap={strokeCap}
    >
      {prepared.useGradient && prepared.style.strokeGradient ? (
        <LinearGradient
          start={vec(prepared.from.x, prepared.from.y)}
          end={vec(prepared.to.x, prepared.to.y)}
          colors={prepared.style.strokeGradient.colors}
        />
      ) : null}
      {dashIntervals ? <DashPathEffect intervals={dashIntervals} /> : null}
    </Path>
  );
}

export const GraphEdgeLayer = React.memo(function GraphEdgeLayer({
  nodes,
  edges,
  color,
  width,
  height,
  matchedNodeIds,
  activeNodeId,
  viewportCull = null,
}: GraphEdgeLayerProps) {
  const renderedEdges = useMemo(
    () => buildGraphRenderedEdges(nodes, edges, matchedNodeIds, activeNodeId, viewportCull),
    [activeNodeId, edges, matchedNodeIds, nodes, viewportCull],
  );

  const preparedEdges = useMemo(
    () => prepareEdgePaths(renderedEdges, color),
    [color, renderedEdges],
  );

  if (preparedEdges.length === 0) {
    return null;
  }

  return (
    <View pointerEvents="none" style={[styles.layer, { width, height }]}>
      <Canvas style={{ width, height }}>
        <Group>
          {preparedEdges.map((prepared) =>
            prepared.glow ? (
              <Path
                key={`${prepared.edgeId}-glow`}
                path={prepared.path}
                style="stroke"
                strokeWidth={prepared.glow.strokeWidth}
                color={prepared.glow.stroke}
                opacity={prepared.glow.opacity}
                strokeCap={prepared.glow.strokeLinecap ?? 'round'}
              />
            ) : null,
          )}
          {preparedEdges.map((prepared) => (
            <GraphEdgeStroke key={prepared.edgeId} prepared={prepared} />
          ))}
        </Group>
      </Canvas>
    </View>
  );
});

const styles = StyleSheet.create({
  layer: {
    left: 0,
    position: 'absolute',
    top: 0,
  },
});
