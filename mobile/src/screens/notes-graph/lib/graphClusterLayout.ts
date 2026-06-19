import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';

import { resolveLayoutEdgeWeight } from './graphEdgeWeight';
import { nodeCenter, nodeDimensions } from './graphNodeMetrics';
import type { GraphEdge, GraphNode } from './graphTypes';
import { recordNodeId } from './graphTypes';

const NODE_LAYOUT_PADDING = 16;
const AVG_NODE_SPAN = 164;
const CLUSTER_INTRA_NODE_GAP = 28;
/** Stronger pull for task → parent inside a cluster subgraph. */
const CLUSTER_CONTAINS_EDGE_WEIGHT = 14;
const TASK_PARENT_INITIAL_GAP = 16;

function getClusterGridGap(totalNodeCount: number): number {
  if (totalNodeCount <= 20) return 72;
  if (totalNodeCount <= 50) return 56;
  if (totalNodeCount <= 100) return 44;
  return 32;
}

function getClusterPadding(totalNodeCount: number): number {
  if (totalNodeCount <= 20) return 20;
  if (totalNodeCount <= 50) return 16;
  return 12;
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
    // Enhanced group labels for better clarity
    let label: string | undefined;
    if (nodeIds.length >= 10) {
      label = `🔗 Group (${nodeIds.length})`;
    } else if (nodeIds.length >= 5) {
      label = `Connected (${nodeIds.length})`;
    }
    // No label for small groups (2-4 nodes) to reduce clutter

    return {
      type: 'group',
      label,
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
  if (nodeCount <= 5) return 160;
  if (nodeCount <= 15) return 240;
  if (nodeCount > 48) return Math.min(360, 90 + nodeCount * 4);
  return Math.min(420, 140 + nodeCount * 8);
}

function buildClusterForceAtlasSettings(
  nodeCount: number,
  clusterType?: GraphClusterType,
  totalGraphNodeCount?: number,
) {
  const inferred = forceAtlas2.inferSettings(nodeCount);

  const isSmall = nodeCount <= 8;
  const isTightCluster = clusterType === 'folder' || clusterType === 'tag';
  const isLargeGraph = (totalGraphNodeCount ?? nodeCount) > 100;

  const baseScalingRatio = Math.max(inferred.scalingRatio ?? 4, 5 + Math.sqrt(nodeCount) * 2.2);
  const scalingRatio = isLargeGraph ? baseScalingRatio * 0.48 : baseScalingRatio * 0.68;

  const baseGravity = isSmall ? 0.52 : nodeCount > 16 ? 0.34 : 0.44;
  const gravity = isLargeGraph ? baseGravity * 1.35 : baseGravity;

  return {
    ...inferred,
    adjustSizes: true,
    barnesHutOptimize: nodeCount > 28,
    barnesHutTheta: 0.4,
    edgeWeightInfluence: isTightCluster ? 0.9 : 0.75,
    gravity,
    linLogMode: false,
    scalingRatio,
    slowDown: nodeCount > 32 ? 4 : 6,
    strongGravityMode: isTightCluster && nodeCount <= 20,
    weighted: true,
  };
}

function resolveClusterSubgraphEdgeWeight(edge: Pick<GraphEdge, 'kind' | 'weight'>): number {
  if (edge.kind === 'contains') return CLUSTER_CONTAINS_EDGE_WEIGHT;
  return resolveLayoutEdgeWeight(edge);
}

function clusterInitialNodeStep(graph: Graph, nodeIds: string[]): number {
  let maxSize = AVG_NODE_SPAN;
  for (const nodeId of nodeIds) {
    const kind = graph.getNodeAttribute(nodeId, 'kind') as GraphNode['kind'];
    maxSize = Math.max(maxSize, nodeSize(kind));
  }
  return maxSize + CLUSTER_INTRA_NODE_GAP;
}

function assignClusterGridInitialPositions(graph: Graph, nodeIds: string[]): void {
  const cols = Math.max(1, Math.ceil(Math.sqrt(nodeIds.length)));
  const step = clusterInitialNodeStep(graph, nodeIds);

  nodeIds.forEach((nodeId, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    graph.setNodeAttribute(nodeId, 'x', col * step);
    graph.setNodeAttribute(nodeId, 'y', row * step);
  });
}

function resolveTaskParentId(
  taskId: string,
  nodeById: Map<string, GraphNode>,
  edges: GraphEdge[],
  clusterIds: Set<string>,
): string | null {
  for (const edge of edges) {
    if (edge.kind !== 'contains' || edge.targetId !== taskId) continue;
    if (clusterIds.has(edge.sourceId)) return edge.sourceId;
  }

  const task = nodeById.get(taskId);
  if (task?.parentRecordId) {
    const parentId = recordNodeId(task.parentRecordId);
    if (clusterIds.has(parentId)) return parentId;
  }

  return null;
}

function assignClusterInitialPositions(
  graph: Graph,
  nodeIds: string[],
  nodeById: Map<string, GraphNode>,
  edges: GraphEdge[],
): void {
  const clusterIds = new Set(nodeIds);
  const recordIds = nodeIds.filter((id) => nodeById.get(id)?.kind === 'record');
  const taskIds = nodeIds.filter((id) => nodeById.get(id)?.kind === 'task');

  assignClusterGridInitialPositions(graph, recordIds.length > 0 ? recordIds : nodeIds);

  if (taskIds.length === 0) return;

  const tasksByParent = new Map<string, string[]>();
  const orphanTaskIds: string[] = [];

  for (const taskId of taskIds) {
    const parentId = resolveTaskParentId(taskId, nodeById, edges, clusterIds);
    if (!parentId || !graph.hasNode(parentId)) {
      orphanTaskIds.push(taskId);
      continue;
    }
    const list = tasksByParent.get(parentId) ?? [];
    list.push(taskId);
    tasksByParent.set(parentId, list);
  }

  for (const [parentId, tasks] of tasksByParent) {
    const px = graph.getNodeAttribute(parentId, 'x') as number;
    const py = graph.getNodeAttribute(parentId, 'y') as number;
    const parentKind = graph.getNodeAttribute(parentId, 'kind') as GraphNode['kind'];
    const parentHalf = nodeSize(parentKind) / 2;
    const taskSpan = nodeSize('task');
    const verticalBase = py + parentHalf + TASK_PARENT_INITIAL_GAP + taskSpan / 2;

    tasks.forEach((taskId, index) => {
      const horizontalSpread =
        tasks.length > 1
          ? (index - (tasks.length - 1) / 2) * (taskSpan + TASK_PARENT_INITIAL_GAP)
          : 0;
      graph.setNodeAttribute(taskId, 'x', px + horizontalSpread);
      graph.setNodeAttribute(taskId, 'y', verticalBase);
    });
  }

  if (orphanTaskIds.length > 0) {
    assignClusterGridInitialPositions(graph, orphanTaskIds);
  }
}

function placeTasksNearParentsInGraph(
  graph: Graph,
  nodeIds: string[],
  nodeById: Map<string, GraphNode>,
  edges: GraphEdge[],
): void {
  const clusterIds = new Set(nodeIds);
  const taskIds = nodeIds.filter((id) => nodeById.get(id)?.kind === 'task');
  if (taskIds.length === 0) return;

  const tasksByParent = new Map<string, string[]>();
  const orphanTaskIds: string[] = [];

  for (const taskId of taskIds) {
    const parentId = resolveTaskParentId(taskId, nodeById, edges, clusterIds);
    if (!parentId || !graph.hasNode(parentId)) {
      orphanTaskIds.push(taskId);
      continue;
    }
    const list = tasksByParent.get(parentId) ?? [];
    list.push(taskId);
    tasksByParent.set(parentId, list);
  }

  for (const [parentId, tasks] of tasksByParent) {
    const px = graph.getNodeAttribute(parentId, 'x') as number;
    const py = graph.getNodeAttribute(parentId, 'y') as number;
    const parentKind = graph.getNodeAttribute(parentId, 'kind') as GraphNode['kind'];
    const parentHalf = nodeSize(parentKind) / 2;
    const taskSpan = nodeSize('task');
    const verticalBase = py + parentHalf + TASK_PARENT_INITIAL_GAP + taskSpan / 2;

    tasks.forEach((taskId, index) => {
      const horizontalSpread =
        tasks.length > 1
          ? (index - (tasks.length - 1) / 2) * (taskSpan + TASK_PARENT_INITIAL_GAP)
          : 0;
      graph.setNodeAttribute(taskId, 'x', px + horizontalSpread);
      graph.setNodeAttribute(taskId, 'y', verticalBase);
    });
  }

  if (orphanTaskIds.length > 0) {
    assignClusterGridInitialPositions(graph, orphanTaskIds);
  }
}

function compactClusterPositions(
  positions: Map<string, { x: number; y: number }>,
  nodeIds: string[],
  nodeById: Map<string, GraphNode>,
): void {
  if (nodeIds.length < 2) return;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxNodeSpan = 0;

  for (const nodeId of nodeIds) {
    const position = positions.get(nodeId);
    const node = nodeById.get(nodeId);
    if (!position || !node) continue;
    const { width, height } = nodeDimensions(node.kind);
    maxNodeSpan = Math.max(maxNodeSpan, Math.max(width, height));
    minX = Math.min(minX, position.x);
    minY = Math.min(minY, position.y);
    maxX = Math.max(maxX, position.x + width);
    maxY = Math.max(maxY, position.y + height);
  }

  if (!Number.isFinite(minX)) return;

  const boundsWidth = maxX - minX;
  const boundsHeight = maxY - minY;
  const cols = Math.ceil(Math.sqrt(nodeIds.length));
  const rows = Math.ceil(nodeIds.length / cols);
  const targetWidth = cols * (maxNodeSpan + CLUSTER_INTRA_NODE_GAP);
  const targetHeight = rows * (maxNodeSpan + CLUSTER_INTRA_NODE_GAP);
  const targetMax = Math.max(targetWidth, targetHeight, maxNodeSpan + 40);
  const actualMax = Math.max(boundsWidth, boundsHeight);

  if (actualMax <= targetMax * 1.2) return;

  const scale = (targetMax * 1.05) / actualMax;
  const centerX = minX + boundsWidth / 2;
  const centerY = minY + boundsHeight / 2;

  for (const nodeId of nodeIds) {
    const position = positions.get(nodeId);
    const node = nodeById.get(nodeId);
    if (!position || !node) continue;
    const { width, height } = nodeDimensions(node.kind);
    const nodeCenterX = position.x + width / 2;
    const nodeCenterY = position.y + height / 2;
    positions.set(nodeId, {
      x: centerX + (nodeCenterX - centerX) * scale - width / 2,
      y: centerY + (nodeCenterY - centerY) * scale - height / 2,
    });
  }
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

    const weight = resolveClusterSubgraphEdgeWeight(edge);
    if (graph.hasEdge(edge.sourceId, edge.targetId)) {
      const existingKey = graph.edge(edge.sourceId, edge.targetId);
      const currentWeight = graph.getEdgeAttribute(existingKey, 'weight') as number;
      graph.setEdgeAttribute(existingKey, 'weight', Math.max(currentWeight, weight));
      continue;
    }

    graph.addEdge(edge.sourceId, edge.targetId, { weight, kind: edge.kind });
  }

  assignClusterInitialPositions(graph, cluster.nodeIds, nodeById, edges);

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

  placeTasksNearParentsInGraph(graph, cluster.nodeIds, nodeById, edges);

  for (const nodeId of cluster.nodeIds) {
    const node = nodeById.get(nodeId);
    if (!node) continue;
    const cx = graph.getNodeAttribute(nodeId, 'x') as number;
    const cy = graph.getNodeAttribute(nodeId, 'y') as number;
    const { width, height } = nodeDimensions(node.kind);
    positions.set(nodeId, { x: cx - width / 2, y: cy - height / 2 });
  }

  compactClusterPositions(positions, cluster.nodeIds, nodeById);

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
  clusterId: string;
  positions: Map<string, { x: number; y: number }>;
  bounds: ClusterBounds;
};

type ClusterGridCell = { row: number; col: number };

function gridCellKey(cell: ClusterGridCell): string {
  return `${cell.row},${cell.col}`;
}

function buildInterClusterAdjacency(
  clusters: GraphCluster[],
  edges: GraphEdge[],
): Map<string, Map<string, number>> {
  const nodeToCluster = new Map<string, string>();
  for (const cluster of clusters) {
    for (const nodeId of cluster.nodeIds) {
      nodeToCluster.set(nodeId, cluster.id);
    }
  }

  const adjacency = new Map<string, Map<string, number>>();
  for (const cluster of clusters) {
    adjacency.set(cluster.id, new Map());
  }

  for (const edge of edges) {
    if (edge.kind === 'contains') continue;
    const sourceCluster = nodeToCluster.get(edge.sourceId);
    const targetCluster = nodeToCluster.get(edge.targetId);
    if (!sourceCluster || !targetCluster || sourceCluster === targetCluster) continue;

    const sourceNeighbors = adjacency.get(sourceCluster)!;
    sourceNeighbors.set(targetCluster, (sourceNeighbors.get(targetCluster) ?? 0) + 1);

    const targetNeighbors = adjacency.get(targetCluster)!;
    targetNeighbors.set(sourceCluster, (targetNeighbors.get(sourceCluster) ?? 0) + 1);
  }

  return adjacency;
}

function adjacentGridCells(cell: ClusterGridCell, preferVertical: boolean): ClusterGridCell[] {
  const right = { row: cell.row, col: cell.col + 1 };
  const left = { row: cell.row, col: cell.col - 1 };
  const down = { row: cell.row + 1, col: cell.col };
  const up = { row: cell.row - 1, col: cell.col };
  return preferVertical ? [down, up, right, left] : [right, left, down, up];
}

function clusterLayoutAspect(layoutWidth: number, layoutHeight: number): number {
  return layoutWidth / Math.max(layoutHeight, 320);
}

function computeTargetClusterGridColumns(
  clusterCount: number,
  layoutWidth: number,
  layoutHeight: number,
): number {
  if (clusterCount <= 1) return 1;
  const layoutAspect = clusterLayoutAspect(layoutWidth, layoutHeight);
  return Math.max(
    1,
    Math.min(clusterCount, Math.max(2, Math.ceil(Math.sqrt(clusterCount * layoutAspect)))),
  );
}

function gridBounds(gridCells: Map<string, ClusterGridCell>): { cols: number; rows: number } {
  let maxRow = 0;
  let maxCol = 0;
  for (const cell of gridCells.values()) {
    maxRow = Math.max(maxRow, cell.row);
    maxCol = Math.max(maxCol, cell.col);
  }
  return { cols: maxCol + 1, rows: maxRow + 1 };
}

function reshapeClusterGridToAspect(
  gridCells: Map<string, ClusterGridCell>,
  layoutWidth: number,
  layoutHeight: number,
): Map<string, ClusterGridCell> {
  const clusterCount = gridCells.size;
  if (clusterCount <= 2) return gridCells;

  const layoutAspect = clusterLayoutAspect(layoutWidth, layoutHeight);
  const { cols: gridCols, rows: gridRows } = gridBounds(gridCells);
  const gridAspect = gridCols / Math.max(gridRows, 1);
  const targetCols = computeTargetClusterGridColumns(clusterCount, layoutWidth, layoutHeight);

  if (gridRows > 1 && gridAspect <= layoutAspect * 1.4) {
    return gridCells;
  }

  if (gridCols <= targetCols) {
    return gridCells;
  }

  const ordered = [...gridCells.entries()].sort((a, b) => {
    const aKey = a[1].row * 1000 + a[1].col;
    const bKey = b[1].row * 1000 + b[1].col;
    return aKey - bKey;
  });

  const reshaped = new Map<string, ClusterGridCell>();
  ordered.forEach(([clusterId], index) => {
    reshaped.set(clusterId, {
      row: Math.floor(index / targetCols),
      col: index % targetCols,
    });
  });
  return reshaped;
}

function findNextFreeGridCell(occupied: Set<string>): ClusterGridCell {
  if (!occupied.has(gridCellKey({ row: 0, col: 0 }))) return { row: 0, col: 0 };

  for (let radius = 1; radius < 64; radius++) {
    for (let row = -radius; row <= radius; row++) {
      for (let col = -radius; col <= radius; col++) {
        if (Math.abs(row) !== radius && Math.abs(col) !== radius) continue;
        const cell = { row, col };
        if (!occupied.has(gridCellKey(cell))) return cell;
      }
    }
  }

  return { row: 0, col: occupied.size };
}

function scoreGridCandidate(
  candidate: ClusterGridCell,
  clusterId: string,
  anchorWeight: number,
  placedPositions: Map<string, ClusterGridCell>,
  adjacency: Map<string, Map<string, number>>,
  layoutAspect: number,
): number {
  let score = anchorWeight;
  const clusterNeighbors = adjacency.get(clusterId);

  for (const [placedId, placedCell] of placedPositions) {
    const weight = clusterNeighbors?.get(placedId) ?? 0;
    if (weight <= 0) continue;
    const dist =
      Math.abs(candidate.row - placedCell.row) + Math.abs(candidate.col - placedCell.col);
    score += weight / Math.max(1, dist);
  }

  let minRow = candidate.row;
  let maxRow = candidate.row;
  let minCol = candidate.col;
  let maxCol = candidate.col;
  for (const cell of placedPositions.values()) {
    minRow = Math.min(minRow, cell.row);
    maxRow = Math.max(maxRow, cell.row);
    minCol = Math.min(minCol, cell.col);
    maxCol = Math.max(maxCol, cell.col);
  }
  const gridCols = maxCol - minCol + 1;
  const gridRows = maxRow - minRow + 1;
  const gridAspect = gridCols / Math.max(gridRows, 1);

  if (gridAspect > layoutAspect) {
    score -= (gridAspect - layoutAspect) * 1.25;
  } else {
    score += (layoutAspect - gridAspect) * 0.35;
  }

  return score;
}

function normalizeClusterGridCells(
  gridCells: Map<string, ClusterGridCell>,
): Map<string, ClusterGridCell> {
  let minRow = Infinity;
  let minCol = Infinity;

  for (const cell of gridCells.values()) {
    minRow = Math.min(minRow, cell.row);
    minCol = Math.min(minCol, cell.col);
  }

  const normalized = new Map<string, ClusterGridCell>();
  for (const [clusterId, cell] of gridCells) {
    normalized.set(clusterId, { row: cell.row - minRow, col: cell.col - minCol });
  }
  return normalized;
}

function assignClusterGridCells(
  clusters: GraphCluster[],
  edges: GraphEdge[],
  layoutWidth: number,
  layoutHeight: number,
): Map<string, ClusterGridCell> {
  const positions = new Map<string, ClusterGridCell>();
  if (clusters.length === 0) return positions;

  const layoutAspect = clusterLayoutAspect(layoutWidth, layoutHeight);
  const preferVertical = layoutAspect < 1;
  const adjacency = buildInterClusterAdjacency(clusters, edges);
  const unplaced = new Set(clusters.map((cluster) => cluster.id));
  const occupied = new Set<string>();
  const anchorNeighborCount = new Map<string, number>();

  const start = [...clusters].sort(
    (a, b) => b.nodeIds.length - a.nodeIds.length || a.id.localeCompare(b.id),
  )[0]!;
  const origin = { row: 0, col: 0 };
  positions.set(start.id, origin);
  unplaced.delete(start.id);
  occupied.add(gridCellKey(origin));

  while (unplaced.size > 0) {
    let bestLink: { clusterId: string; anchorId: string; weight: number } | null = null;

    for (const clusterId of unplaced) {
      for (const [anchorId] of positions) {
        const weight = adjacency.get(clusterId)?.get(anchorId) ?? 0;
        if (weight <= 0) continue;
        if (!bestLink || weight > bestLink.weight) {
          bestLink = { clusterId, anchorId, weight };
        } else if (weight === bestLink.weight && clusterId.localeCompare(bestLink.clusterId) < 0) {
          bestLink = { clusterId, anchorId, weight };
        }
      }
    }

    if (!bestLink) {
      const clusterId = [...unplaced].sort((a, b) => a.localeCompare(b))[0]!;
      const cell = findNextFreeGridCell(occupied);
      positions.set(clusterId, cell);
      unplaced.delete(clusterId);
      occupied.add(gridCellKey(cell));
      continue;
    }

    const anchorCell = positions.get(bestLink.anchorId)!;
    const neighborIndex = anchorNeighborCount.get(bestLink.anchorId) ?? 0;
    anchorNeighborCount.set(bestLink.anchorId, neighborIndex + 1);

    const orderedAdjacents = adjacentGridCells(anchorCell, preferVertical);
    const rotatedAdjacents = Array.from(
      { length: orderedAdjacents.length },
      (_, index) => orderedAdjacents[(index + neighborIndex) % orderedAdjacents.length]!,
    );
    const seen = new Set<string>();
    const candidates = [...rotatedAdjacents, ...orderedAdjacents].filter((cell) => {
      const key = gridCellKey(cell);
      if (occupied.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    let chosen = candidates[0] ?? findNextFreeGridCell(occupied);

    if (candidates.length > 1) {
      let bestScore = -Infinity;
      for (const candidate of candidates) {
        const score = scoreGridCandidate(
          candidate,
          bestLink.clusterId,
          bestLink.weight,
          positions,
          adjacency,
          layoutAspect,
        );
        if (score > bestScore) {
          bestScore = score;
          chosen = candidate;
        }
      }
    }

    positions.set(bestLink.clusterId, chosen);
    unplaced.delete(bestLink.clusterId);
    occupied.add(gridCellKey(chosen));
  }

  return reshapeClusterGridToAspect(
    normalizeClusterGridCells(positions),
    layoutWidth,
    layoutHeight,
  );
}

function placeClustersOnViewportGrid(
  entries: ClusterLayoutEntry[],
  totalNodeCount: number,
  gridCells: Map<string, ClusterGridCell>,
): Map<string, { x: number; y: number }> {
  const mergedPositions = new Map<string, { x: number; y: number }>();
  if (entries.length === 0) return mergedPositions;

  const clusterGridGap = getClusterGridGap(totalNodeCount);
  const clusterPadding = getClusterPadding(totalNodeCount);

  let columns = 1;
  let rowCount = 1;
  for (const cell of gridCells.values()) {
    columns = Math.max(columns, cell.col + 1);
    rowCount = Math.max(rowCount, cell.row + 1);
  }

  const minClusterCellSpan = AVG_NODE_SPAN + CLUSTER_INTRA_NODE_GAP;
  const columnWidths = Array.from({ length: columns }, () => minClusterCellSpan);
  const rowHeights = Array.from({ length: rowCount }, () => minClusterCellSpan);

  for (const entry of entries) {
    const cell = gridCells.get(entry.clusterId);
    if (!cell) continue;
    columnWidths[cell.col] = Math.max(
      columnWidths[cell.col]!,
      entry.bounds.width + clusterPadding * 2,
    );
    rowHeights[cell.row] = Math.max(
      rowHeights[cell.row]!,
      entry.bounds.height + clusterPadding * 2,
    );
  }

  const columnOffsets = Array.from({ length: columns }, () => 0);
  for (let col = 1; col < columns; col++) {
    columnOffsets[col] = columnOffsets[col - 1]! + columnWidths[col - 1]! + clusterGridGap;
  }

  const rowOffsets = Array.from({ length: rowCount }, () => 0);
  for (let row = 1; row < rowCount; row++) {
    rowOffsets[row] = rowOffsets[row - 1]! + rowHeights[row - 1]! + clusterGridGap;
  }

  for (const entry of entries) {
    const cell = gridCells.get(entry.clusterId);
    if (!cell) continue;

    const cellWidth = columnWidths[cell.col]!;
    const cellHeight = rowHeights[cell.row]!;
    const clusterWidth = entry.bounds.width;
    const clusterHeight = entry.bounds.height;
    const cellLeft = columnOffsets[cell.col]!;
    const cellTop = rowOffsets[cell.row]!;

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
  }

  return mergedPositions;
}

/** Re-anchors task cards below their parent record after global overlap resolution. */
export function reanchorClusterTaskNodes(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const layoutNodes = nodes.map((node) => ({ ...node }));
  const layoutById = new Map(layoutNodes.map((node) => [node.id, node]));
  const clusterIds = new Set(nodes.map((node) => node.id));
  const tasksByParent = new Map<string, GraphNode[]>();

  for (const node of layoutNodes) {
    if (node.kind !== 'task') continue;
    const parentId = resolveTaskParentId(node.id, nodeById, edges, clusterIds);
    if (!parentId) continue;
    if (!layoutById.has(parentId)) continue;
    const list = tasksByParent.get(parentId) ?? [];
    list.push(node);
    tasksByParent.set(parentId, list);
  }

  for (const [parentId, tasks] of tasksByParent) {
    const parent = layoutById.get(parentId)!;
    const parentCenter = nodeCenter(parent);
    const parentHalf = nodeSize(parent.kind) / 2;
    const taskDims = nodeDimensions('task');
    const taskSpan = nodeSize('task');
    const verticalTop = parentCenter.y + parentHalf + TASK_PARENT_INITIAL_GAP;

    tasks.forEach((task, index) => {
      const horizontalSpread =
        tasks.length > 1
          ? (index - (tasks.length - 1) / 2) * (taskSpan + TASK_PARENT_INITIAL_GAP)
          : 0;
      const taskCenterX = parentCenter.x + horizontalSpread;
      const taskCenterY = verticalTop + taskDims.height / 2;
      task.x = taskCenterX - taskDims.width / 2;
      task.y = taskCenterY - taskDims.height / 2;
    });
  }

  return layoutNodes;
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
  const gridCells = assignClusterGridCells(clusters, edges, layoutWidth, layoutHeight);
  const totalNodeCount = nodes.length;

  const clusterLayouts: ClusterLayoutEntry[] = clusters.map((cluster) => {
    const positions = layoutClusterSubgraph(nodes, edges, cluster, totalNodeCount, fixedPositions);
    return {
      clusterId: cluster.id,
      positions,
      bounds: measureClusterBounds(positions, nodeById),
    };
  });

  const mergedPositions = placeClustersOnViewportGrid(clusterLayouts, totalNodeCount, gridCells);

  return nodes.map((node) => {
    const position = mergedPositions.get(node.id) ?? { x: 0, y: 0 };
    const source = nodeById.get(node.id) ?? node;
    return { ...source, x: position.x, y: position.y };
  });
}
