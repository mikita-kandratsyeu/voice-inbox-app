import {
  Canvas,
  DashPathEffect,
  Group,
  LinearGradient,
  matchFont,
  RoundedRect,
  Text,
  vec,
} from '@shopify/react-native-skia';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import type { Folder } from '@/entities/folder';
import type { Colors } from '@/shared/config';
import { resolveDisplayFolderColor, withAlphaHex } from '@/shared/lib';

import type { GraphCluster } from '../lib/graphClusterLayout';
import { nodeDimensions } from '../lib/graphNodeMetrics';
import type { GraphNode } from '../lib/graphTypes';
import { GRAPH_CLUSTER_BOUNDARY_PADDING } from '../lib/graphViewportBounds';
import { GraphSkiaWorldGroup } from './GraphSkiaWorldGroup';

const CLUSTER_PADDING = GRAPH_CLUSTER_BOUNDARY_PADDING;
const CLUSTER_LABEL_OFFSET = 16;
const CLUSTER_BORDER_RADIUS = 16;

const clusterLabelFont = matchFont({
  fontFamily: Platform.select({ ios: 'System', default: 'sans-serif' }),
  fontSize: 13,
  fontWeight: '600',
});

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
  canvasWidth: number;
  canvasHeight: number;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  scale: SharedValue<number>;
  visible: boolean;
  showFolderClusters?: boolean;
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

function getClusterDashIntervals(cluster: GraphCluster): number[] | null {
  switch (cluster.type) {
    case 'tag':
      return [6, 4];
    case 'group':
      return [3, 6];
    default:
      return null;
  }
}

export const GraphClusterBoundaries = React.memo(function GraphClusterBoundaries({
  nodes,
  clusters,
  foldersById,
  isProActive,
  color,
  canvasWidth,
  canvasHeight,
  translateX,
  translateY,
  scale,
  visible,
  showFolderClusters = true,
}: GraphClusterBoundariesProps) {
  const { t } = useTranslation();
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  const clusterBounds = useMemo(() => {
    if (!visible) return [];
    return clusters
      .filter(
        (cluster) =>
          (showFolderClusters || cluster.type !== 'folder') &&
          cluster.type !== 'tag' &&
          (cluster.nodeIds.length > 1 || cluster.type !== 'solo'),
      )
      .map((cluster) => computeClusterBounds(cluster, nodeById))
      .filter((bounds): bounds is ClusterBounds => bounds !== null)
      .sort((a, b) => {
        const priorityA = a.cluster.type === 'folder' ? 0 : a.cluster.type === 'tag' ? 1 : 2;
        const priorityB = b.cluster.type === 'folder' ? 0 : b.cluster.type === 'tag' ? 1 : 2;
        return priorityB - priorityA;
      });
  }, [clusters, nodeById, showFolderClusters, visible]);

  if (!visible || clusterBounds.length === 0) {
    return null;
  }

  const folderRemovedLabel = t('folders.detailFolderRemoved');

  return (
    <View
      pointerEvents="none"
      style={[styles.layer, { width: canvasWidth, height: canvasHeight }]}
    >
      <Canvas style={{ width: canvasWidth, height: canvasHeight }}>
        <GraphSkiaWorldGroup
          translateX={translateX}
          translateY={translateY}
          scale={scale}
          opacity={0.65}
        >
          {clusterBounds.map(({ cluster, minX, minY, width: rectWidth, height: rectHeight }) => {
            const clusterColor = getClusterColor(cluster, color, foldersById, isProActive);
            const dashIntervals = getClusterDashIntervals(cluster);

            return (
              <Group key={cluster.id}>
                <RoundedRect
                  x={minX}
                  y={minY}
                  width={rectWidth}
                  height={rectHeight}
                  r={CLUSTER_BORDER_RADIUS}
                >
                  <LinearGradient
                    start={vec(minX, minY)}
                    end={vec(minX, minY + rectHeight)}
                    colors={[withAlphaHex(clusterColor, 0.08), withAlphaHex(clusterColor, 0.02)]}
                  />
                </RoundedRect>
                <RoundedRect
                  x={minX}
                  y={minY}
                  width={rectWidth}
                  height={rectHeight}
                  r={CLUSTER_BORDER_RADIUS}
                  style="stroke"
                  strokeWidth={2}
                  color={clusterColor}
                >
                  {dashIntervals ? <DashPathEffect intervals={dashIntervals} /> : null}
                </RoundedRect>
              </Group>
            );
          })}
        </GraphSkiaWorldGroup>
        <GraphSkiaWorldGroup translateX={translateX} translateY={translateY} scale={scale}>
          {clusterBounds.map(({ cluster, minX, minY }) => {
            const displayLabel = getClusterDisplayLabel(cluster, foldersById, folderRemovedLabel);
            const showLabel = !!displayLabel && cluster.nodeIds.length >= 3;
            if (!showLabel) return null;

            const clusterColor = getClusterColor(cluster, color, foldersById, isProActive);

            return (
              <Text
                key={`${cluster.id}-label`}
                x={minX + CLUSTER_LABEL_OFFSET}
                y={minY + CLUSTER_LABEL_OFFSET + clusterLabelFont.getSize()}
                text={displayLabel}
                font={clusterLabelFont}
                color={clusterColor}
                opacity={0.85}
              />
            );
          })}
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
