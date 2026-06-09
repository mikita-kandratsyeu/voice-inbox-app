import type { GraphEdge, GraphNode } from './graphTypes';
import { nodeDimensions } from './graphNodeMetrics';

const ISOLATED_SHELF_GAP = 98;
const ISOLATED_SHELF_MARGIN = 80;

function isRecordWithoutNoteLinks(nodeId: string, edges: GraphEdge[]): boolean {
  return !edges.some(
    (edge) =>
      edge.kind !== 'contains' &&
      (edge.sourceId === nodeId || edge.targetId === nodeId),
  );
}

export function layoutIsolatedRecordNodes(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] {
  const isolated = nodes.filter(
    (node) => node.kind === 'record' && isRecordWithoutNoteLinks(node.id, edges),
  );
  if (isolated.length === 0) return nodes;

  let maxRight = 0;
  let minTop = Infinity;

  for (const node of nodes) {
    const { width, height } = nodeDimensions(node.kind);
    maxRight = Math.max(maxRight, node.x + width);
    minTop = Math.min(minTop, node.y);
  }

  const shelfX = maxRight + ISOLATED_SHELF_MARGIN;
  const shelfStartY = Number.isFinite(minTop) ? minTop : 0;
  const isolatedIds = new Set(isolated.map((node) => node.id));

  return nodes.map((node) => {
    if (!isolatedIds.has(node.id)) return node;
    const index = isolated.findIndex((item) => item.id === node.id);
    return {
      ...node,
      x: shelfX,
      y: shelfStartY + index * ISOLATED_SHELF_GAP,
    };
  });
}
