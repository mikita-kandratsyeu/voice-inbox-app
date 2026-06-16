import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';

import { resolveLayoutEdgeWeight } from './graphEdgeWeight';
import { nodeDimensions } from './graphNodeMetrics';
import type { GraphEdge, GraphNode } from './graphTypes';
import { recordNodeId } from './graphTypes';

const NODE_LAYOUT_PADDING = 24;
const AVG_NODE_SPAN = 188;

/**
 * Adaptive cluster spacing that scales down for large graphs to keep them within viewport bounds.
 * Large graphs (>50 nodes) get tighter spacing to prevent excessive zoom-out requirements.
 */
function getClusterGridGap(totalNodeCount: number): number {
  if (totalNodeCount <= 20) return 180; // Spacious for small graphs
  if (totalNodeCount <= 50) return 140; // Medium spacing
  if (totalNodeCount <= 100) return 100; // Compact for large graphs
  return 80; // Very compact for huge graphs (100+)
}

function getClusterPadding(totalNodeCount: number): number {
  if (totalNodeCount <= 20) return 32; // Comfortable for small graphs
  if (totalNodeCount <= 50) return 24; // Tighter for medium graphs
  return 16; // Minimal for large graphs
}

export type GraphClusterType = 'folder' | 'tag' | 'group' | 'solo';

export type GraphCluster = {
  id: string;
  nodeIds: string[];
  type: GraphClusterType;
  label?: string;
  color?: string;
};

function normalizeClusterTag(tag: string): string {
  return tag.trim().toLowerCase();
}

function nodeSize(kind: GraphNode['kind']): number {
  const { width, height } = nodeDimensions(kind);
  return Math.max(width, height) + NODE_LAYOUT_PADDING;
}

function buildTagCooccurrenceCounts(nodes: GraphNode[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const node of nodes) {
    if (node.kind !== 'record' || !node.record) continue;
    const tags = [...new Set((node.record.tags ?? []).map(normalizeClusterTag).filter(Boolean))];
    for (const tag of tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return counts;
}

function recordClusterSeed(node: GraphNode, tagCooccurrence: Map<string, number>): string {
  if (!node.record) return `record:${node.id}`;

  if (node.record.folderId) return `folder:${node.record.folderId}`;

  const tags = (node.record.tags ?? []).map(normalizeClusterTag).filter(Boolean);
  if (tags.length > 0) {
    const primary = [...tags].sort((a, b) => {
      const countDiff = (tagCooccurrence.get(b) ?? 0) - (tagCooccurrence.get(a) ?? 0);
      return countDiff !== 0 ? countDiff : a.localeCompare(b);
    })[0]!;
    return `tag:${primary}`;
  }

  return `solo:${node.id}`;
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

function parentRecordNodeId(node: GraphNode, edges: GraphEdge[]): string | null {
  if (node.parentRecordId) return recordNodeId(node.parentRecordId);

  const containsEdge = edges.find((edge) => edge.kind === 'contains' && edge.targetId === node.id);
  return containsEdge?.sourceId ?? null;
}

function extractClusterMetadata(
  clusterId: string,
  nodeIds: string[],
  _nodeById: Map<string, GraphNode>,
): { type: GraphClusterType; label?: string } {
  if (clusterId.startsWith('folder:')) {
    return {
      type: 'folder',
    };
  }

  if (clusterId.startsWith('tag:')) {
    const tag = clusterId.replace('tag:', '');
    return {
      type: 'tag',
      label: `#${tag}`,
    };
  }

  if (clusterId.startsWith('group:')) {
    return {
      type: 'group',
      label: nodeIds.length > 3 ? `Connected (${nodeIds.length})` : undefined,
    };
  }

  return {
    type: 'solo',
  };
}

export function buildGraphClusters(nodes: GraphNode[], edges: GraphEdge[]): GraphCluster[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const clusterByNode = new Map<string, string>();
  const tagCooccurrence = buildTagCooccurrenceCounts(nodes);

  for (const node of nodes) {
    if (node.kind === 'record') {
      clusterByNode.set(node.id, recordClusterSeed(node, tagCooccurrence));
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
    .map(([id, nodeIds]) => {
      const metadata = extractClusterMetadata(id, nodeIds, nodeById);
      return {
        id,
        nodeIds,
        type: metadata.type,
        label: metadata.label,
      };
    })
    .sort((a, b) => {
      const typePriority: Record<GraphClusterType, number> = {
        folder: 0,
        tag: 1,
        group: 2,
        solo: 3,
      };
      const priorityDiff = typePriority[a.type] - typePriority[b.type];
      if (priorityDiff !== 0) return priorityDiff;
      return b.nodeIds.length - a.nodeIds.length;
    });
}

function clusterForceIterations(nodeCount: number): number {
  if (nodeCount <= 1) return 0;
  if (nodeCount <= 5) return 180;
  if (nodeCount <= 15) return 280;
  if (nodeCount > 48) return Math.min(420, 100 + nodeCount * 5);
  return Math.min(600, 150 + nodeCount * 12);
}

function buildClusterForceAtlasSettings(
  nodeCount: number,
  clusterType?: GraphClusterType,
  totalGraphNodeCount?: number,
) {
  const inferred = forceAtlas2.inferSettings(nodeCount);

  const isSmall = nodeCount <= 8;
  const isTightCluster = clusterType === 'folder' || clusterType === 'tag';

  // For large graphs (100+ total nodes), reduce scaling ratio to keep clusters compact
  const isLargeGraph = (totalGraphNodeCount ?? nodeCount) > 100;
  const baseScalingRatio = Math.max(inferred.scalingRatio ?? 8, 12 + Math.sqrt(nodeCount) * 6);
  const scalingRatio = isLargeGraph ? baseScalingRatio * 0.7 : baseScalingRatio;

  // Increase gravity for large graphs to pull nodes together
  const baseGravity = isSmall ? 0.22 : nodeCount > 16 ? 0.12 : 0.18;
  const gravity = isLargeGraph ? baseGravity * 1.5 : baseGravity;

  return {
    ...inferred,
    adjustSizes: true,
    barnesHutOptimize: nodeCount > 28,
    barnesHutTheta: 0.4,
    edgeWeightInfluence: isTightCluster ? 0.75 : 0.62,
    gravity,
    linLogMode: !isTightCluster,
    scalingRatio,
    slowDown: nodeCount > 32 ? 5 : 7,
    strongGravityMode: isTightCluster && nodeCount <= 12,
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
  totalGraphNodeCount: number,
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

    const weight = resolveLayoutEdgeWeight(edge);
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
    settings: buildClusterForceAtlasSettings(
      cluster.nodeIds.length,
      cluster.type,
      totalGraphNodeCount,
    ),
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
  totalNodeCount: number,
  clusterGridGap: number,
): number {
  if (clusterCount <= 1) return 1;
  if (clusterCount === 2) return 2;
  if (clusterCount === 3) return 3;

  const maxClusterWidth = Math.max(...entries.map((e) => e.bounds.width), AVG_NODE_SPAN * 0.75);

  const widthBasedCols = Math.floor(
    (layoutWidth + clusterGridGap) / (maxClusterWidth + clusterGridGap),
  );

  const aspect = layoutWidth / Math.max(layoutHeight, 320);
  const aspectCols = Math.ceil(Math.sqrt(clusterCount * aspect));

  let columns = Math.min(clusterCount, Math.max(2, widthBasedCols, aspectCols));

  // For large graphs (>50 nodes), use more columns to create wider, less tall layouts
  if (totalNodeCount > 100) {
    // 100+ nodes: prefer wide layout (4-6 columns)
    columns = Math.max(columns, Math.min(6, Math.ceil(Math.sqrt(clusterCount * 1.5))));
  } else if (totalNodeCount > 50) {
    // 50-100 nodes: moderately wide (3-4 columns)
    columns = Math.max(columns, Math.min(4, Math.ceil(Math.sqrt(clusterCount * 1.2))));
  } else {
    // Small graphs: existing logic
    if (clusterCount >= 4 && clusterCount <= 6) {
      columns = Math.min(3, columns);
    } else if (clusterCount > 6 && clusterCount <= 9) {
      columns = Math.min(3, columns);
    }
  }

  return columns;
}

function placeClustersOnViewportGrid(
  entries: ClusterLayoutEntry[],
  layoutWidth: number,
  layoutHeight: number,
  totalNodeCount: number,
): Map<string, { x: number; y: number }> {
  const mergedPositions = new Map<string, { x: number; y: number }>();
  if (entries.length === 0) return mergedPositions;

  const clusterGridGap = getClusterGridGap(totalNodeCount);
  const clusterPadding = getClusterPadding(totalNodeCount);

  const columns = computeClusterGridColumns(
    entries.length,
    layoutWidth,
    layoutHeight,
    entries,
    totalNodeCount,
    clusterGridGap,
  );
  const rowCount = Math.ceil(entries.length / columns);

  const columnWidths = Array.from({ length: columns }, (_, col) => {
    let maxWidth = AVG_NODE_SPAN * 0.55;
    for (let i = col; i < entries.length; i += columns) {
      const entry = entries[i];
      if (entry) {
        maxWidth = Math.max(maxWidth, entry.bounds.width + clusterPadding * 2);
      }
    }
    return maxWidth;
  });

  const rowHeights = Array.from({ length: rowCount }, () => 0);
  entries.forEach((entry, index) => {
    const row = Math.floor(index / columns);
    rowHeights[row] = Math.max(
      rowHeights[row]!,
      entry.bounds.height + clusterPadding * 2,
      AVG_NODE_SPAN * 0.55,
    );
  });

  const columnOffsets = Array.from({ length: columns }, () => 0);
  for (let col = 1; col < columns; col++) {
    columnOffsets[col] = columnOffsets[col - 1]! + columnWidths[col - 1]! + clusterGridGap;
  }

  const rowOffsets = Array.from({ length: rowCount }, () => 0);
  for (let row = 1; row < rowCount; row++) {
    rowOffsets[row] = rowOffsets[row - 1]! + rowHeights[row - 1]! + clusterGridGap;
  }

  entries.forEach((entry, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const cellWidth = columnWidths[column]!;
    const cellHeight = rowHeights[row]!;
    const clusterWidth = entry.bounds.width;
    const clusterHeight = entry.bounds.height;

    const cellLeft = columnOffsets[column]!;
    const cellTop = rowOffsets[row]!;

    const offsetX =
      cellLeft +
      clusterPadding +
      Math.max(0, (cellWidth - clusterPadding * 2 - clusterWidth) / 2) -
      entry.bounds.minX;
    const offsetY =
      cellTop +
      clusterPadding +
      Math.max(0, (cellHeight - clusterPadding * 2 - clusterHeight) / 2) -
      entry.bounds.minY;

    for (const [nodeId, position] of entry.positions) {
      mergedPositions.set(nodeId, {
        x: position.x + offsetX,
        y: position.y + offsetY,
      });
    }
  });

  return mergedPositions;
}

function orderClustersByConnectivity(clusters: GraphCluster[], edges: GraphEdge[]): GraphCluster[] {
  if (clusters.length <= 2) return clusters;

  const nodeToCluster = new Map<string, string>();
  for (const cluster of clusters) {
    for (const nodeId of cluster.nodeIds) {
      nodeToCluster.set(nodeId, cluster.id);
    }
  }

  const clusterById = new Map(clusters.map((cluster) => [cluster.id, cluster]));
  const adjacency = new Map<string, Set<string>>();
  for (const cluster of clusters) {
    adjacency.set(cluster.id, new Set());
  }

  for (const edge of edges) {
    if (edge.kind === 'contains') continue;
    const sourceCluster = nodeToCluster.get(edge.sourceId);
    const targetCluster = nodeToCluster.get(edge.targetId);
    if (!sourceCluster || !targetCluster || sourceCluster === targetCluster) continue;
    adjacency.get(sourceCluster)!.add(targetCluster);
    adjacency.get(targetCluster)!.add(sourceCluster);
  }

  const ordered: GraphCluster[] = [];
  const visited = new Set<string>();
  const startCandidates = [...clusters].sort(
    (a, b) => b.nodeIds.length - a.nodeIds.length || a.id.localeCompare(b.id),
  );

  const visitFrom = (startId: string) => {
    const queue = [startId];
    visited.add(startId);

    while (queue.length > 0) {
      const clusterId = queue.shift()!;
      const cluster = clusterById.get(clusterId);
      if (cluster) ordered.push(cluster);

      const neighbors = [...(adjacency.get(clusterId) ?? [])]
        .filter((id) => !visited.has(id))
        .sort((a, b) => {
          const sizeDiff =
            (clusterById.get(b)?.nodeIds.length ?? 0) - (clusterById.get(a)?.nodeIds.length ?? 0);
          return sizeDiff !== 0 ? sizeDiff : a.localeCompare(b);
        });

      for (const neighborId of neighbors) {
        visited.add(neighborId);
        queue.push(neighborId);
      }
    }
  };

  for (const cluster of startCandidates) {
    if (!visited.has(cluster.id)) {
      visitFrom(cluster.id);
    }
  }

  return ordered;
}

export function layoutNodesByClusters(
  nodes: GraphNode[],
  edges: GraphEdge[],
  layoutWidth: number,
  layoutHeight: number,
  fixedPositions?: Map<string, { x: number; y: number }>,
): GraphNode[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const clusters = orderClustersByConnectivity(buildGraphClusters(nodes, edges), edges);
  const totalNodeCount = nodes.length;

  const clusterLayouts: ClusterLayoutEntry[] = clusters.map((cluster) => {
    const positions = layoutClusterSubgraph(nodes, edges, cluster, totalNodeCount, fixedPositions);
    return {
      positions,
      bounds: measureClusterBounds(positions, nodeById),
    };
  });

  const mergedPositions = placeClustersOnViewportGrid(
    clusterLayouts,
    layoutWidth,
    layoutHeight,
    totalNodeCount,
  );

  return nodes.map((node) => {
    const position = mergedPositions.get(node.id) ?? { x: 0, y: 0 };
    const source = nodeById.get(node.id) ?? node;
    return { ...source, x: position.x, y: position.y };
  });
}
