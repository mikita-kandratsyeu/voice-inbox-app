import type { SkPath } from '@shopify/react-native-skia';
import { Canvas, DashPathEffect, LinearGradient, Path, vec } from '@shopify/react-native-skia';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import type { Colors } from '@/shared/config';

import { buildGraphRenderedEdges, type GraphViewportCull } from '../lib/buildGraphRenderedEdges';
import type { EdgeDensityInfo } from '../lib/graphEdgeDensity';
import { getGraphEdgeGlowStyle, getGraphEdgeStrokeStyle } from '../lib/graphEdgeStyles';
import { getCachedSkiaPath } from '../lib/graphSkiaUtils';
import { parseStrokeDashIntervals } from '../lib/graphStrokeDash';
import type { GraphEdge, GraphNode, GraphNodeDisplayMode } from '../lib/graphTypes';
import { GraphSkiaWorldGroup } from './GraphSkiaWorldGroup';

type GraphEdgeLayerProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  color: Colors;
  canvasWidth: number;
  canvasHeight: number;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  scale: SharedValue<number>;
  matchedNodeIds: ReadonlySet<string> | null;
  activeNodeId: string | null;
  viewportCull?: GraphViewportCull | null;
  nodeDisplayMode?: GraphNodeDisplayMode;
  edgeDensityInfo?: EdgeDensityInfo;
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
  densityInfo?: EdgeDensityInfo,
): PreparedEdgePath[] {
  const items: PreparedEdgePath[] = [];
  const baseOpacity = densityInfo?.baseOpacity ?? 1;

  for (const { edge, path, from, to, emphasis } of renderedEdges) {
    const skiaPath = getCachedSkiaPath(`${edge.id}:${path}`, path);
    if (!skiaPath) continue;

    const glow = emphasis === 'highlighted' ? getGraphEdgeGlowStyle(edge.kind, color) : null;
    const style = getGraphEdgeStrokeStyle(edge.kind, color, emphasis);
    const useGradient = emphasis !== 'dimmed' && Boolean(style.strokeGradient);

    const adjustedOpacity =
      emphasis === 'highlighted' ? style.opacity : (style.opacity ?? 1) * baseOpacity;

    items.push({
      edgeId: edge.id,
      path: skiaPath,
      glow,
      style: {
        ...style,
        opacity: adjustedOpacity,
      },
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
  canvasWidth,
  canvasHeight,
  translateX,
  translateY,
  scale,
  matchedNodeIds,
  activeNodeId,
  viewportCull = null,
  nodeDisplayMode = 'cards',
  edgeDensityInfo,
}: GraphEdgeLayerProps) {
  const renderedEdges = useMemo(
    () =>
      buildGraphRenderedEdges(
        nodes,
        edges,
        matchedNodeIds,
        activeNodeId,
        viewportCull,
        nodeDisplayMode,
      ),
    [activeNodeId, edges, matchedNodeIds, nodes, viewportCull, nodeDisplayMode],
  );

  const preparedEdges = useMemo(
    () => prepareEdgePaths(renderedEdges, color, edgeDensityInfo),
    [color, renderedEdges, edgeDensityInfo],
  );

  if (preparedEdges.length === 0) {
    return null;
  }

  return (
    <View pointerEvents="none" style={[styles.layer, { width: canvasWidth, height: canvasHeight }]}>
      <Canvas style={{ width: canvasWidth, height: canvasHeight }}>
        <GraphSkiaWorldGroup
          translateX={translateX}
          translateY={translateY}
          scale={scale}
          opacity={layerOpacityValue}
        >
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
        </GraphSkiaWorldGroup>
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
