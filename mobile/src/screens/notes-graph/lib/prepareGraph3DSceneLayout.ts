import { type SkColor, Skia } from '@shopify/react-native-skia';

import type { Folder } from '@/entities/folder';
import type { Colors } from '@/shared/config';
import { resolveDisplayFolderColor } from '@/shared/lib';

import { buildGraph3DLayout } from './buildGraph3DLayout';
import { getGraphEdgeStrokeStyle } from './graphEdgeStyles';
import type { GraphEdge, GraphEdgeKind, GraphNode } from './graphTypes';
import { resolveGraph3DNodeColor } from './resolveGraph3DNodeColor';

export type Graph3DSceneEdge = {
  sourceIndex: number;
  targetIndex: number;
  color: SkColor;
  importance: number;
  strokeWidth: number;
  opacity: number;
};

export type Graph3DSceneCluster = {
  id: string;
  label: string;
  color: SkColor;
  count: number;
  x: number;
  y: number;
  z: number;
  radius: number;
};

export type Graph3DSceneClusterSummary = {
  id: string;
  label: string;
  color: string;
  count: number;
};

export type Graph3DNodeLegendKind =
  | 'folder'
  | 'inbox'
  | 'archived'
  | 'taskOpen'
  | 'taskHigh'
  | 'taskMedium'
  | 'taskDone';

export type Graph3DNodeLegendItem = {
  id: string;
  kind: Graph3DNodeLegendKind;
  label: string;
  color: string;
  count: number;
};

export type Graph3DSceneLayout = {
  nodePoints: number[];
  nodeColors: SkColor[];
  nodeKinds: number[];
  nodeCount: number;
  edges: Graph3DSceneEdge[];
  clusters: Graph3DSceneCluster[];
  clusterSummaries: Graph3DSceneClusterSummary[];
  nodeLegendItems: Graph3DNodeLegendItem[];
  recordCount: number;
  taskCount: number;
};

function colorStringToSkiaColor(value: string): SkColor {
  return Skia.Color(value);
}

function edgeImportance(kind: GraphEdgeKind): number {
  switch (kind) {
    case 'contains':
    case 'linked':
      return 3;
    case 'sameFolder':
    case 'sharedTag':
      return 2;
    case 'similar':
    default:
      return 1;
  }
}

function graph3DClusterKey(node: GraphNode): string {
  if (node.kind === 'task' && node.parentRecordId) {
    return `record:${node.parentRecordId}`;
  }

  if (node.kind === 'record' && node.record) {
    if (node.record.folderId) {
      return `folder:${node.record.folderId}`;
    }

    const primaryTag = (node.record.tags ?? [])
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
      .sort()[0];

    if (primaryTag) {
      return `tag:${primaryTag}`;
    }
  }

  return `solo:${node.id}`;
}

function resolveTaskParentClusterKey(
  node: GraphNode,
  containsParentByTaskId: Map<string, string>,
  nodeById: Map<string, GraphNode>,
): string {
  if (node.kind !== 'task') {
    return graph3DClusterKey(node);
  }

  const parentNodeId = containsParentByTaskId.get(node.id);
  const parent = parentNodeId ? nodeById.get(parentNodeId) : null;
  return parent ? graph3DClusterKey(parent) : graph3DClusterKey(node);
}

function clusterLabelAndColor(
  clusterId: string,
  nodes: GraphNode[],
  foldersById: Map<string, Folder>,
  color: Colors,
  isProActive: boolean,
): { label: string; color: string } {
  if (clusterId.startsWith('folder:')) {
    const folderId = clusterId.slice('folder:'.length);
    const folder = foldersById.get(folderId);
    return {
      label: folder?.name ?? 'Folder',
      color: folder?.color
        ? resolveDisplayFolderColor(folder.color, isProActive)
        : color.accent.primary,
    };
  }

  if (clusterId.startsWith('tag:')) {
    return {
      label: `#${clusterId.slice('tag:'.length)}`,
      color: color.accent.cache,
    };
  }

  if (clusterId.startsWith('record:')) {
    const recordId = clusterId.slice('record:'.length);
    const node = nodes.find((item) => item.record?.id === recordId);
    return {
      label: node?.record?.title || 'Note tasks',
      color: color.accent.primary,
    };
  }

  return {
    label: 'Ungrouped',
    color: color.text.secondary,
  };
}

function buildSceneClusters(
  nodes: GraphNode[],
  edges: GraphEdge[],
  nodePoints: number[],
  foldersById: Map<string, Folder>,
  color: Colors,
  isProActive: boolean,
): { clusters: Graph3DSceneCluster[]; summaries: Graph3DSceneClusterSummary[] } {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const containsParentByTaskId = new Map<string, string>();

  for (const edge of edges) {
    if (edge.kind === 'contains') {
      containsParentByTaskId.set(edge.targetId, edge.sourceId);
    }
  }

  const clusterNodeIndices = new Map<string, number[]>();

  for (let index = 0; index < nodes.length; index += 1) {
    const clusterId = resolveTaskParentClusterKey(nodes[index], containsParentByTaskId, nodeById);
    const indices = clusterNodeIndices.get(clusterId) ?? [];
    indices.push(index);
    clusterNodeIndices.set(clusterId, indices);
  }

  const clusters: Graph3DSceneCluster[] = [];
  const summaries: Graph3DSceneClusterSummary[] = [];

  for (const [clusterId, indices] of clusterNodeIndices.entries()) {
    if (indices.length < 2) {
      continue;
    }

    let x = 0;
    let y = 0;
    let z = 0;

    for (const nodeIndex of indices) {
      const offset = nodeIndex * 3;
      x += nodePoints[offset];
      y += nodePoints[offset + 1];
      z += nodePoints[offset + 2];
    }

    x /= indices.length;
    y /= indices.length;
    z /= indices.length;

    let radius = 0;
    for (const nodeIndex of indices) {
      const offset = nodeIndex * 3;
      radius = Math.max(
        radius,
        Math.hypot(nodePoints[offset] - x, nodePoints[offset + 1] - y, nodePoints[offset + 2] - z),
      );
    }

    const resolved = clusterLabelAndColor(clusterId, nodes, foldersById, color, isProActive);

    clusters.push({
      id: clusterId,
      label: resolved.label,
      color: colorStringToSkiaColor(resolved.color),
      count: indices.length,
      x,
      y,
      z,
      radius: Math.max(radius + 0.07, 0.12),
    });
    summaries.push({
      id: clusterId,
      label: resolved.label,
      color: resolved.color,
      count: indices.length,
    });
  }

  clusters.sort((left, right) => right.count - left.count);
  summaries.sort((left, right) => right.count - left.count);

  return { clusters: clusters.slice(0, 18), summaries: summaries.slice(0, 10) };
}

function buildGraph3DNodeLegendItems(
  nodes: GraphNode[],
  foldersById: Map<string, Folder>,
  color: Colors,
  isProActive: boolean,
): Graph3DNodeLegendItem[] {
  const items = new Map<string, Graph3DNodeLegendItem>();

  const upsert = (
    id: string,
    kind: Graph3DNodeLegendKind,
    label: string,
    itemColor: string,
  ): void => {
    const existing = items.get(id);
    if (existing) {
      existing.count += 1;
      return;
    }

    items.set(id, { id, kind, label, color: itemColor, count: 1 });
  };

  for (const node of nodes) {
    if (node.kind === 'task' && node.task) {
      if (node.task.isDone) {
        upsert('task:done', 'taskDone', '', color.text.muted);
      } else if (node.task.priority === 'high') {
        upsert('task:high', 'taskHigh', '', color.accent.delete);
      } else if (node.task.priority === 'medium') {
        upsert('task:medium', 'taskMedium', '', color.accent.cache);
      } else {
        upsert('task:open', 'taskOpen', '', color.accent.primary);
      }
      continue;
    }

    if (node.kind === 'record' && node.record) {
      const folderId = node.record.folderId;
      if (folderId) {
        const folder = foldersById.get(folderId);
        const itemColor = folder?.color
          ? resolveDisplayFolderColor(folder.color, isProActive)
          : color.accent.primary;
        upsert(`folder:${folderId}`, 'folder', folder?.name ?? 'Folder', itemColor);
      } else if (node.record.status === 'archived') {
        upsert('archived', 'archived', '', color.accent.archive);
      } else {
        upsert('inbox', 'inbox', '', color.accent.primary);
      }
    }
  }

  return [...items.values()].sort((left, right) => right.count - left.count);
}

export function prepareGraph3DSceneLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  color: Colors,
  foldersById: Map<string, Folder>,
  isProActive: boolean,
): Graph3DSceneLayout | null {
  if (nodes.length === 0) {
    return null;
  }

  const nodeIndexById = new Map<string, number>();
  const { nodePoints, nodeKinds } = buildGraph3DLayout(nodes, edges);
  const nodeColors: SkColor[] = [];
  let recordCount = 0;
  let taskCount = 0;

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    nodeIndexById.set(node.id, index);
    if (node.kind === 'task') {
      taskCount += 1;
    } else {
      recordCount += 1;
    }
    nodeColors.push(
      colorStringToSkiaColor(resolveGraph3DNodeColor(node, color, foldersById, isProActive)),
    );
  }

  const sceneEdges: Graph3DSceneEdge[] = [];
  const sceneClusters = buildSceneClusters(
    nodes,
    edges,
    nodePoints,
    foldersById,
    color,
    isProActive,
  );

  for (const edge of edges) {
    const sourceIndex = nodeIndexById.get(edge.sourceId);
    const targetIndex = nodeIndexById.get(edge.targetId);

    if (sourceIndex == null || targetIndex == null) {
      continue;
    }

    const style = getGraphEdgeStrokeStyle(edge.kind, color);

    sceneEdges.push({
      sourceIndex,
      targetIndex,
      color: colorStringToSkiaColor(style.stroke),
      importance: edgeImportance(edge.kind),
      strokeWidth: style.strokeWidth,
      opacity: style.opacity ?? 1,
    });
  }

  return {
    nodePoints,
    nodeColors,
    nodeKinds,
    nodeCount: nodes.length,
    edges: sceneEdges,
    clusters: sceneClusters.clusters,
    clusterSummaries: sceneClusters.summaries,
    nodeLegendItems: buildGraph3DNodeLegendItems(nodes, foldersById, color, isProActive),
    recordCount,
    taskCount,
  };
}
