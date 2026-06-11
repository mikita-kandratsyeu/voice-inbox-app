import React, { useMemo } from 'react';
import Svg, { Defs, LinearGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

import type { Colors } from '@/shared/config';

import type { GraphCluster } from '../lib/graphClusterLayout';
import { nodeDimensions } from '../lib/graphNodeMetrics';
import type { GraphNode } from '../lib/graphTypes';

const CLUSTER_PADDING = 32;
const CLUSTER_LABEL_OFFSET = 16;
const CLUSTER_BORDER_RADIUS = 16;

type ClusterBounds = {
  cluster: GraphCluster;
  minX: number;
  minY: number;
  width: number;
  height: number;
};

type GraphClusterBoundariesProps = {
  nodes: GraphNode[];
  clusters: GraphCluster[];
  color: Colors;
  width: number;
  height: number;
  visible: boolean;
};

function computeClusterBounds(
  cluster: GraphCluster,
  nodeById: Map<string, GraphNode>,
): ClusterBounds | null {
  if (cluster.nodeIds.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const nodeId of cluster.nodeIds) {
    const node = nodeById.get(nodeId);
    if (!node) continue;
    const { width: nodeWidth, height: nodeHeight } = nodeDimensions(node.kind);
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + nodeWidth);
    maxY = Math.max(maxY, node.y + nodeHeight);
  }

  if (!Number.isFinite(minX)) return null;

  return {
    cluster,
    minX: minX - CLUSTER_PADDING,
    minY: minY - CLUSTER_PADDING,
    width: maxX - minX + CLUSTER_PADDING * 2,
    height: maxY - minY + CLUSTER_PADDING * 2,
  };
}

function getClusterColor(cluster: GraphCluster, color: Colors): string {
  switch (cluster.type) {
    case 'folder':
      return color.accent.primary;
    case 'tag':
      return color.text.secondary;
    case 'group':
      return color.text.muted;
    case 'solo':
    default:
      return color.border.default;
  }
}

function getClusterGradientId(cluster: GraphCluster): string {
  return `cluster-gradient-${cluster.id}`;
}

export const GraphClusterBoundaries = React.memo(function GraphClusterBoundaries({
  nodes,
  clusters,
  color,
  width,
  height,
  visible,
}: GraphClusterBoundariesProps) {
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const clusterBounds = useMemo(() => {
    if (!visible) return [];
    return clusters
      .filter((c) => c.nodeIds.length > 1 || c.type !== 'solo')
      .map((cluster) => computeClusterBounds(cluster, nodeById))
      .filter((b): b is ClusterBounds => b !== null)
      .sort((a, b) => {
        const priorityA = a.cluster.type === 'folder' ? 0 : a.cluster.type === 'tag' ? 1 : 2;
        const priorityB = b.cluster.type === 'folder' ? 0 : b.cluster.type === 'tag' ? 1 : 2;
        return priorityB - priorityA;
      });
  }, [clusters, nodeById, visible]);

  if (!visible || clusterBounds.length === 0) {
    return null;
  }

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', left: 0, top: 0 }}
      pointerEvents="none"
    >
      <Defs>
        {clusterBounds.map(({ cluster }) => {
          const clusterColor = getClusterColor(cluster, color);
          const gradientId = getClusterGradientId(cluster);
          return (
            <LinearGradient key={gradientId} id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={clusterColor} stopOpacity={0.08} />
              <Stop offset="100%" stopColor={clusterColor} stopOpacity={0.02} />
            </LinearGradient>
          );
        })}
      </Defs>

      {clusterBounds.map(({ cluster, minX, minY, width: rectWidth, height: rectHeight }) => {
        const clusterColor = getClusterColor(cluster, color);
        const gradientId = getClusterGradientId(cluster);
        const showLabel = !!cluster.label && cluster.nodeIds.length >= 3;

        return (
          <React.Fragment key={cluster.id}>
            <Rect
              x={minX}
              y={minY}
              width={rectWidth}
              height={rectHeight}
              rx={CLUSTER_BORDER_RADIUS}
              ry={CLUSTER_BORDER_RADIUS}
              fill={`url(#${gradientId})`}
              stroke={clusterColor}
              strokeWidth={1.5}
              strokeDasharray={
                cluster.type === 'tag' ? '6 4' : cluster.type === 'group' ? '3 6' : undefined
              }
              opacity={0.65}
            />

            {showLabel && (
              <SvgText
                x={minX + CLUSTER_LABEL_OFFSET}
                y={minY + CLUSTER_LABEL_OFFSET}
                fill={clusterColor}
                fontSize={13}
                fontWeight="600"
                opacity={0.85}
              >
                {cluster.label}
              </SvgText>
            )}
          </React.Fragment>
        );
      })}
    </Svg>
  );
});
