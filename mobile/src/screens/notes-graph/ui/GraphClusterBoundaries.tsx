import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Svg, { Defs, LinearGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

import type { Folder } from '@/entities/folder';
import type { Colors } from '@/shared/config';
import { resolveDisplayFolderColor } from '@/shared/lib';

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
  foldersById: Map<string, Folder>;
  isProActive: boolean;
  color: Colors;
  width: number;
  height: number;
  visible: boolean;
};

function getClusterDisplayLabel(
  cluster: GraphCluster,
  foldersById: Map<string, Folder>,
  folderRemovedLabel: string,
): string | undefined {
  if (cluster.type === 'folder') {
    const folderId = cluster.id.startsWith('folder:') ? cluster.id.slice('folder:'.length) : '';
    if (!folderId) return undefined;

    const folderName = foldersById.get(folderId)?.name.trim();
    return folderName || folderRemovedLabel;
  }

  return cluster.label;
}

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

function getFolderClusterColor(
  cluster: GraphCluster,
  foldersById: Map<string, Folder>,
  isProActive: boolean,
  fallback: string,
): string {
  const folderId = cluster.id.startsWith('folder:') ? cluster.id.slice('folder:'.length) : '';
  const folder = folderId ? foldersById.get(folderId) : undefined;
  if (!folder) return fallback;

  return resolveDisplayFolderColor(folder.color, isProActive);
}

function getClusterColor(
  cluster: GraphCluster,
  color: Colors,
  foldersById: Map<string, Folder>,
  isProActive: boolean,
): string {
  switch (cluster.type) {
    case 'folder':
      return getFolderClusterColor(cluster, foldersById, isProActive, color.accent.primary);
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
  foldersById,
  isProActive,
  color,
  width,
  height,
  visible,
}: GraphClusterBoundariesProps) {
  const { t } = useTranslation();
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const clusterBounds = useMemo(() => {
    if (!visible) return [];
    return clusters
      .filter((c) => c.type !== 'tag' && (c.nodeIds.length > 1 || c.type !== 'solo'))
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
          const clusterColor = getClusterColor(cluster, color, foldersById, isProActive);
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
        const clusterColor = getClusterColor(cluster, color, foldersById, isProActive);
        const gradientId = getClusterGradientId(cluster);
        const displayLabel = getClusterDisplayLabel(
          cluster,
          foldersById,
          t('folders.detailFolderRemoved'),
        );
        const showLabel = !!displayLabel && cluster.nodeIds.length >= 3;

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
                {displayLabel}
              </SvgText>
            )}
          </React.Fragment>
        );
      })}
    </Svg>
  );
});
