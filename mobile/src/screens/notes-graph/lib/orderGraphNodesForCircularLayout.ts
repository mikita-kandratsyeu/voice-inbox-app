import type { GraphEdge, GraphNode } from './graphTypes';
import { recordNodeId } from './graphTypes';

function isNoteToNoteEdge(edge: GraphEdge): boolean {
  return edge.kind !== 'contains';
}

function buildRecordAdjacency(nodes: GraphNode[], edges: GraphEdge[]): Map<string, Set<string>> {
  const recordIds = new Set(nodes.filter((node) => node.kind === 'record').map((node) => node.id));
  const adjacency = new Map<string, Set<string>>();

  for (const recordId of recordIds) {
    adjacency.set(recordId, new Set());
  }

  for (const edge of edges) {
    if (!isNoteToNoteEdge(edge)) continue;
    if (!recordIds.has(edge.sourceId) || !recordIds.has(edge.targetId)) continue;

    adjacency.get(edge.sourceId)!.add(edge.targetId);
    adjacency.get(edge.targetId)!.add(edge.sourceId);
  }

  return adjacency;
}

function orderRecordIdsByConnectivity(
  recordIds: string[],
  adjacency: Map<string, Set<string>>,
): string[] {
  if (recordIds.length <= 1) return recordIds;

  const remaining = new Set(recordIds);
  const ordered: string[] = [];

  const pickStart = (): string => {
    let best = recordIds[0]!;
    let bestDegree = -1;
    for (const id of remaining) {
      const degree = adjacency.get(id)?.size ?? 0;
      if (degree > bestDegree) {
        best = id;
        bestDegree = degree;
      }
    }
    return best;
  };

  while (remaining.size > 0) {
    const start = pickStart();
    const stack = [start];
    remaining.delete(start);

    while (stack.length > 0) {
      const current = stack.pop()!;
      ordered.push(current);

      const neighbors = [...(adjacency.get(current) ?? [])]
        .filter((id) => remaining.has(id))
        .sort((a, b) => {
          const degreeDiff = (adjacency.get(b)?.size ?? 0) - (adjacency.get(a)?.size ?? 0);
          return degreeDiff !== 0 ? degreeDiff : a.localeCompare(b);
        });

      for (const neighbor of neighbors) {
        remaining.delete(neighbor);
        stack.push(neighbor);
      }
    }
  }

  return ordered;
}

function groupTasksByParent(nodes: GraphNode[]): Map<string, GraphNode[]> {
  const tasksByParent = new Map<string, GraphNode[]>();

  for (const node of nodes) {
    if (node.kind !== 'task') continue;
    const parentId = node.parentRecordId != null ? recordNodeId(node.parentRecordId) : null;
    if (!parentId) continue;
    const list = tasksByParent.get(parentId) ?? [];
    list.push(node);
    tasksByParent.set(parentId, list);
  }

  for (const tasks of tasksByParent.values()) {
    tasks.sort((a, b) => a.id.localeCompare(b.id));
  }

  return tasksByParent;
}

/** Places connected records adjacent on the ring; tasks follow their parent record. */
export function orderGraphNodesForCircularLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
): GraphNode[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const recordNodes = nodes.filter((node) => node.kind === 'record');
  const tasksByParent = groupTasksByParent(nodes);

  const adjacency = buildRecordAdjacency(nodes, edges);
  const orderedRecordIds = orderRecordIdsByConnectivity(
    recordNodes.map((node) => node.id),
    adjacency,
  );

  const ordered: GraphNode[] = [];
  const placed = new Set<string>();

  for (const recordId of orderedRecordIds) {
    const record = nodeById.get(recordId);
    if (!record) continue;
    ordered.push(record);
    placed.add(recordId);

    for (const task of tasksByParent.get(recordId) ?? []) {
      ordered.push(task);
      placed.add(task.id);
    }
  }

  for (const node of nodes) {
    if (!placed.has(node.id)) {
      ordered.push(node);
    }
  }

  return ordered;
}
