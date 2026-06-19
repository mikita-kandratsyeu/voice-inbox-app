import type { GraphCluster } from './graphClusterLayout';
import { nodeDimensions } from './graphNodeMetrics';
import type { GraphEdge, GraphNode } from './graphTypes';

export type CollapsedClusterNode = {
  id: string;
  clusterId: string;
  collapsedNodeIds: string[];
  x: number;
  y: number;
  displayLabel: string;
  nodeCount: number;
  clusterType: GraphCluster['type'];
};

export function computeClusterCentroid(
  cluster: GraphCluster,
  nodeById: Map<string, GraphNode>,
): { x: number; y: number } {
  let sumX = 0;
  let sumY = 0;
  let count = 0;

  for (const nodeId of cluster.nodeIds) {
    const node = nodeById.get(nodeId);
    if (!node) continue;
    const dim = nodeDimensions(node.kind);
    sumX += node.x + dim.width / 2;
    sumY += node.y + dim.height / 2;
    count++;
  }

  if (count === 0) return { x: 0, y: 0 };

  return {
    x: sumX / count - 82,
    y: sumY / count - 43,
  };
}

export function createCollapsedClusterNode(
  cluster: GraphCluster,
  nodeById: Map<string, GraphNode>,
  displayLabel: string,
): CollapsedClusterNode {
  const centroid = computeClusterCentroid(cluster, nodeById);

  return {
    id: `collapsed:${cluster.id}`,
    clusterId: cluster.id,
    collapsedNodeIds: [...cluster.nodeIds],
    x: centroid.x,
    y: centroid.y,
    displayLabel,
    nodeCount: cluster.nodeIds.length,
    clusterType: cluster.type,
  };
}

export function applyCollapsedClustersToLayout(
  nodes: GraphNode[],
  collapsedClusters: Map<string, CollapsedClusterNode>,
): GraphNode[] {
  if (collapsedClusters.size === 0) return nodes;

  const collapsedNodeIds = new Set<string>();
  for (const collapsed of collapsedClusters.values()) {
    for (const nodeId of collapsed.collapsedNodeIds) {
      collapsedNodeIds.add(nodeId);
    }
  }

  return nodes.filter((node) => !collapsedNodeIds.has(node.id));
}

export function rerouteEdgesForCollapsedClusters(
  edges: GraphEdge[],
  collapsedClusters: Map<string, CollapsedClusterNode>,
): GraphEdge[] {
  if (collapsedClusters.size === 0) return edges;

  const nodeToCluster = new Map<string, string>();
  for (const collapsed of collapsedClusters.values()) {
    for (const nodeId of collapsed.collapsedNodeIds) {
      nodeToCluster.set(nodeId, collapsed.id);
    }
  }

  const reroutedEdges: GraphEdge[] = [];
  const internalEdges = new Set<string>();

  for (const edge of edges) {
    const sourceCluster = nodeToCluster.get(edge.sourceId);
    const targetCluster = nodeToCluster.get(edge.targetId);

    if (sourceCluster && targetCluster && sourceCluster === targetCluster) {
      internalEdges.add(edge.id);
      continue;
    }

    const newSourceId = sourceCluster ?? edge.sourceId;
    const newTargetId = targetCluster ?? edge.targetId;

    reroutedEdges.push({
      ...edge,
      sourceId: newSourceId,
      targetId: newTargetId,
      id: `${newSourceId}→${newTargetId}:${edge.kind}`,
    });
  }

  const uniqueEdges = new Map<string, GraphEdge>();
  for (const edge of reroutedEdges) {
    const key = `${edge.sourceId}|${edge.targetId}|${edge.kind}`;
    if (!uniqueEdges.has(key)) {
      uniqueEdges.set(key, edge);
    }
  }

  return Array.from(uniqueEdges.values());
}

export function isCollapsedClusterNode(nodeId: string): boolean {
  return nodeId.startsWith('collapsed:');
}

export type CollapsedClusterIconName = 'Folder' | 'Tag' | 'Link2' | 'Package';

export function getCollapsedClusterIconName(
  clusterType: GraphCluster['type'],
): CollapsedClusterIconName {
  switch (clusterType) {
    case 'folder':
      return 'Folder';
    case 'tag':
      return 'Tag';
    case 'group':
      return 'Link2';
    default:
      return 'Package';
  }
}
