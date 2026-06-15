import type { GraphEdge } from './graphTypes';

export function countGraphNodeConnections(nodeId: string, edges: GraphEdge[]): number {
  let count = 0;
  for (const edge of edges) {
    if (edge.sourceId === nodeId || edge.targetId === nodeId) {
      count += 1;
    }
  }
  return count;
}

export function buildGraphNodeConnectionCounts(edges: GraphEdge[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const edge of edges) {
    counts.set(edge.sourceId, (counts.get(edge.sourceId) ?? 0) + 1);
    counts.set(edge.targetId, (counts.get(edge.targetId) ?? 0) + 1);
  }
  return counts;
}
