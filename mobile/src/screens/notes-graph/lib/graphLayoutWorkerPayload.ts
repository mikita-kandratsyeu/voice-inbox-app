import type {
  LayoutWorkerNodePosition,
  LayoutWorkerRequest,
  LayoutWorkerResponse,
} from './graphLayoutWorkerTypes';
import type { GraphEdge, GraphNode } from './graphTypes';

export function buildLayoutWorkerRequest(
  nodes: GraphNode[],
  edges: GraphEdge[],
  viewportWidth: number,
  viewportHeight: number,
  layoutMode: LayoutWorkerRequest['layoutMode'],
  fixedPositions: Map<string, { x: number; y: number }>,
): LayoutWorkerRequest {
  const fixed: Record<string, { x: number; y: number }> = {};
  for (const [id, position] of fixedPositions.entries()) {
    fixed[id] = position;
  }

  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      kind: node.kind,
      x: node.x,
      y: node.y,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      kind: edge.kind,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      weight: edge.weight,
    })),
    viewportWidth,
    viewportHeight,
    layoutMode,
    fixedPositions: fixed,
  };
}

export function mergeLayoutWorkerResponse(
  nodes: GraphNode[],
  response: LayoutWorkerResponse,
): GraphNode[] {
  const positionById = new Map<string, LayoutWorkerNodePosition>(
    response.nodes.map((node) => [node.id, node]),
  );

  return nodes.map((node) => {
    const position = positionById.get(node.id);
    if (!position || (node.x === position.x && node.y === position.y)) {
      return node;
    }
    return { ...node, x: position.x, y: position.y };
  });
}
