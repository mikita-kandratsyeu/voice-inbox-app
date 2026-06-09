import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';

import { nodeDimensions } from './graphNodeMetrics';
import type { GraphEdge, GraphNode } from './graphTypes';
import { recordNodeId } from './graphTypes';

const NODE_LAYOUT_PADDING = 24;
const CLUSTER_GRID_GAP = 140;
const AVG_NODE_SPAN = 188;

export type GraphCluster = {
  id: string;
  nodeIds: string[];
};

function normalizeClusterTag(tag: string): string {
  return tag.trim().toLowerCase();
}

function nodeSize(kind: GraphNode['kind']): number {
  const { width, height } = nodeDimensions(kind);
  return Math.max(width, height) + NODE_LAYOUT_PADDING;
}

function edgeWeight(kind: GraphEdge['kind']): number {
  switch (kind) {
    case 'contains':
      return 4;
    case 'similar':
      return 3;
    case 'sharedTag':
      return 1.4;
    case 'sameFolder':
      return 2;
    default:
      return 1.5;
  }
}

class UnionFind {
  private parent = new Map<string, string>();

  add(id: string): void {
    if (!this.parent.has(id)) this.parent.set(id, id);
  }

  find(id: string): string {
    let root = id;
    while (this.parent.get(root) !== root) {
      root = this.parent.get(root)!;
    }
    let current = id;
    while (this.parent.get(current) !== root) {
      const next = this.parent.get(current)!;
      this.parent.set(current, root);
      current = next;
    }
    return root;
  }

  union(a: string, b: string): void {
    this.add(a);
    this.add(b);
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent.set(rootB, rootA);
  }
}

function recordClusterSeed(node: GraphNode): string {
  if (!node.record) return `record:${node.id}`;

  if (node.record.folderId) return `folder:${node.record.folderId}`;

  const tags = (node.record.tags ?? []).map(normalizeClusterTag).filter(Boolean).sort();
  if (tags.length > 0) return `tag:${tags[0]}`;

  return `solo:${node.id}`;
}

function parentRecordNodeId(node: GraphNode, edges: GraphEdge[]): string | null {
  if (node.parentRecordId) return recordNodeId(node.parentRecordId);

  const containsEdge = edges.find((edge) => edge.kind === 'contains' && edge.targetId === node.id);
  return containsEdge?.sourceId ?? null;
}

export function buildGraphClusters(nodes: GraphNode[], edges: GraphEdge[]): GraphCluster[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const clusterByNode = new Map<string, string>();

  for (const node of nodes) {
    if (node.kind === 'record') {
      clusterByNode.set(node.id, recordClusterSeed(node));
    }
  }

  const soloUnion = new UnionFind();
  for (const node of nodes) {
    if (node.kind === 'record' && clusterByNode.get(node.id)?.startsWith('solo:')) {
      soloUnion.add(node.id);
    }
  }

  for (const edge of edges) {
    if (edge.kind === 'contains') continue;

    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    if (!source || !target || source.kind !== 'record' || target.kind !== 'record') continue;

    const sourceCluster = clusterByNode.get(source.id);
    const targetCluster = clusterByNode.get(target.id);
    if (!sourceCluster?.startsWith('solo:') || !targetCluster?.startsWith('solo:')) continue;

    soloUnion.union(source.id, target.id);
  }

  for (const node of nodes) {
    if (node.kind !== 'record') continue;
    const clusterId = clusterByNode.get(node.id);
    if (clusterId?.startsWith('solo:')) {
      clusterByNode.set(node.id, `group:${soloUnion.find(node.id)}`);
    }
  }

  for (const node of nodes) {
    if (node.kind !== 'task') continue;
    const parentId = parentRecordNodeId(node, edges);
    const parentCluster = parentId ? clusterByNode.get(parentId) : undefined;
    clusterByNode.set(node.id, parentCluster ?? `task:${node.id}`);
  }

  const grouped = new Map<string, string[]>();
  for (const node of nodes) {
    const clusterId = clusterByNode.get(node.id) ?? `node:${node.id}`;
    const list = grouped.get(clusterId) ?? [];
    list.push(node.id);
    grouped.set(clusterId, list);
  }

  return [...grouped.entries()]
    .map(([id, nodeIds]) => ({ id, nodeIds }))
    .sort((a, b) => b.nodeIds.length - a.nodeIds.length);
}

function clusterForceIterations(nodeCount: number): number {
  if (nodeCount <= 1) return 0;
  if (nodeCount > 48) return Math.min(360, 80 + nodeCount * 4);
  return Math.min(520, 100 + nodeCount * 10);
}

function buildClusterForceAtlasSettings(nodeCount: number) {
  const inferred = forceAtlas2.inferSettings(nodeCount);

  return {
    ...inferred,
    adjustSizes: true,
    barnesHutOptimize: nodeCount > 36,
    edgeWeightInfluence: 0.62,
    gravity: nodeCount > 16 ? 0.1 : 0.16,
    linLogMode: true,
    scalingRatio: Math.max(inferred.scalingRatio ?? 8, 10 + Math.sqrt(nodeCount) * 5.5),
    slowDown: nodeCount > 32 ? 4 : 6,
    weighted: true,
  };
}

function assignClusterGridInitialPositions(graph: Graph, nodeIds: string[]): void {
  const cols = Math.max(1, Math.ceil(Math.sqrt(nodeIds.length)));

  nodeIds.forEach((nodeId, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    graph.setNodeAttribute(nodeId, 'x', col * AVG_NODE_SPAN);
    graph.setNodeAttribute(nodeId, 'y', row * AVG_NODE_SPAN);
  });
}

function layoutClusterSubgraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  cluster: GraphCluster,
  fixedPositions?: Map<string, { x: number; y: number }>,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const clusterIds = new Set(cluster.nodeIds);

  if (cluster.nodeIds.length === 0) return positions;

  if (cluster.nodeIds.length === 1) {
    const nodeId = cluster.nodeIds[0]!;
    const node = nodeById.get(nodeId);
    if (!node) return positions;
    const fixed = fixedPositions?.get(nodeId);
    positions.set(nodeId, fixed ?? { x: 0, y: 0 });
    return positions;
  }

  const graph = new Graph({ type: 'undirected', multi: false, allowSelfLoops: false });

  for (const nodeId of cluster.nodeIds) {
    const node = nodeById.get(nodeId);
    if (!node) continue;
    graph.addNode(nodeId, {
      kind: node.kind,
      size: nodeSize(node.kind),
      x: 0,
      y: 0,
    });
  }

  for (const edge of edges) {
    if (!clusterIds.has(edge.sourceId) || !clusterIds.has(edge.targetId)) continue;
    if (edge.sourceId === edge.targetId) continue;

    const weight = edgeWeight(edge.kind);
    if (graph.hasEdge(edge.sourceId, edge.targetId)) {
      const existingKey = graph.edge(edge.sourceId, edge.targetId);
      const currentWeight = graph.getEdgeAttribute(existingKey, 'weight') as number;
      graph.setEdgeAttribute(existingKey, 'weight', Math.max(currentWeight, weight));
      continue;
    }

    graph.addEdge(edge.sourceId, edge.targetId, { weight, kind: edge.kind });
  }

  assignClusterGridInitialPositions(graph, cluster.nodeIds);

  if (fixedPositions?.size) {
    graph.forEachNode((nodeId) => {
      const fixed = fixedPositions.get(nodeId);
      if (!fixed) return;
      const kind = graph.getNodeAttribute(nodeId, 'kind') as GraphNode['kind'];
      const { width, height } = nodeDimensions(kind);
      graph.setNodeAttribute(nodeId, 'x', fixed.x + width / 2);
      graph.setNodeAttribute(nodeId, 'y', fixed.y + height / 2);
      graph.setNodeAttribute(nodeId, 'fixed', true);
    });
  }

  forceAtlas2.assign(graph, {
    iterations: clusterForceIterations(cluster.nodeIds.length),
    settings: buildClusterForceAtlasSettings(cluster.nodeIds.length),
  });

  for (const nodeId of cluster.nodeIds) {
    const node = nodeById.get(nodeId);
    if (!node) continue;
    const cx = graph.getNodeAttribute(nodeId, 'x') as number;
    const cy = graph.getNodeAttribute(nodeId, 'y') as number;
    const { width, height } = nodeDimensions(node.kind);
    positions.set(nodeId, { x: cx - width / 2, y: cy - height / 2 });
  }

  return positions;
}

type ClusterBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};

function measureClusterBounds(
  positions: Map<string, { x: number; y: number }>,
  nodeById: Map<string, GraphNode>,
): ClusterBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const [nodeId, position] of positions) {
    const node = nodeById.get(nodeId);
    if (!node) continue;
    const { width, height } = nodeDimensions(node.kind);
    minX = Math.min(minX, position.x);
    minY = Math.min(minY, position.y);
    maxX = Math.max(maxX, position.x + width);
    maxY = Math.max(maxY, position.y + height);
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

type ClusterLayoutEntry = {
  positions: Map<string, { x: number; y: number }>;
  bounds: ClusterBounds;
};

function computeClusterGridColumns(
  clusterCount: number,
  layoutWidth: number,
  layoutHeight: number,
  entries: ClusterLayoutEntry[],
): number {
  if (clusterCount <= 1) return 1;

  const avgClusterWidth =
    entries.reduce((sum, entry) => sum + Math.max(entry.bounds.width, AVG_NODE_SPAN * 0.75), 0) /
    clusterCount;
  const widthBasedCols = Math.floor(
    (layoutWidth + CLUSTER_GRID_GAP) / (avgClusterWidth + CLUSTER_GRID_GAP),
  );
  const aspect = layoutWidth / Math.max(layoutHeight, 320);
  const aspectCols = Math.ceil(Math.sqrt(clusterCount * aspect));

  return Math.min(clusterCount, Math.max(2, widthBasedCols, aspectCols));
}

function placeClustersOnViewportGrid(
  entries: ClusterLayoutEntry[],
  layoutWidth: number,
  layoutHeight: number,
): Map<string, { x: number; y: number }> {
  const mergedPositions = new Map<string, { x: number; y: number }>();
  if (entries.length === 0) return mergedPositions;

  const columns = computeClusterGridColumns(entries.length, layoutWidth, layoutHeight, entries);
  const columnWidth = (layoutWidth - (columns - 1) * CLUSTER_GRID_GAP) / columns;
  const rowCount = Math.ceil(entries.length / columns);
  const rowHeights = Array.from({ length: rowCount }, () => 0);

  entries.forEach((entry, index) => {
    const row = Math.floor(index / columns);
    rowHeights[row] = Math.max(
      rowHeights[row]!,
      Math.max(entry.bounds.height, AVG_NODE_SPAN * 0.55),
    );
  });

  const rowOffsets = Array.from({ length: rowCount }, () => 0);
  for (let row = 1; row < rowCount; row++) {
    rowOffsets[row] = rowOffsets[row - 1]! + rowHeights[row - 1]! + CLUSTER_GRID_GAP;
  }

  entries.forEach((entry, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const clusterWidth = Math.max(entry.bounds.width, AVG_NODE_SPAN * 0.55);
    const cellLeft = column * (columnWidth + CLUSTER_GRID_GAP);
    const offsetX = cellLeft + Math.max(0, (columnWidth - clusterWidth) / 2) - entry.bounds.minX;
    const offsetY = rowOffsets[row]! - entry.bounds.minY;

    for (const [nodeId, position] of entry.positions) {
      mergedPositions.set(nodeId, {
        x: position.x + offsetX,
        y: position.y + offsetY,
      });
    }
  });

  return mergedPositions;
}

export function layoutNodesByClusters(
  nodes: GraphNode[],
  edges: GraphEdge[],
  layoutWidth: number,
  layoutHeight: number,
  fixedPositions?: Map<string, { x: number; y: number }>,
): GraphNode[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const clusters = buildGraphClusters(nodes, edges);

  const clusterLayouts: ClusterLayoutEntry[] = clusters.map((cluster) => {
    const positions = layoutClusterSubgraph(nodes, edges, cluster, fixedPositions);
    return {
      positions,
      bounds: measureClusterBounds(positions, nodeById),
    };
  });

  const mergedPositions = placeClustersOnViewportGrid(clusterLayouts, layoutWidth, layoutHeight);

  return nodes.map((node) => {
    const position = mergedPositions.get(node.id) ?? { x: 0, y: 0 };
    const source = nodeById.get(node.id) ?? node;
    return { ...source, x: position.x, y: position.y };
  });
}
