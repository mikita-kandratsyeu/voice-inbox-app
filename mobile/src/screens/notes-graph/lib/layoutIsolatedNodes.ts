import { nodeDimensions } from './graphNodeMetrics';
import type { GraphEdge, GraphNode } from './graphTypes';
import { RECORD_NODE_WIDTH } from './graphTypes';

const ISOLATED_ROW_GAP = 98;
const ISOLATED_COLUMN_GAP = 36;
const ISOLATED_SECTION_MARGIN = 80;
const ISOLATED_EDGE_PADDING = 80;

function isRecordWithoutNoteLinks(nodeId: string, edges: GraphEdge[]): boolean {
  return !edges.some(
    (edge) =>
      edge.kind !== 'contains' &&
      (edge.sourceId === nodeId || edge.targetId === nodeId),
  );
}

function computeIsolatedGridColumns(isolatedCount: number, layoutWidth: number): number {
  const columnStride = RECORD_NODE_WIDTH + ISOLATED_COLUMN_GAP;
  const widthBasedCols = Math.floor(
    (layoutWidth - ISOLATED_EDGE_PADDING * 2 + ISOLATED_COLUMN_GAP) / columnStride,
  );

  return Math.max(
    1,
    Math.min(isolatedCount, Math.max(widthBasedCols, Math.ceil(Math.sqrt(isolatedCount)))),
  );
}

export function layoutIsolatedRecordNodes(
  nodes: GraphNode[],
  edges: GraphEdge[],
  layoutWidth?: number,
): GraphNode[] {
  const isolated = nodes.filter(
    (node) => node.kind === 'record' && isRecordWithoutNoteLinks(node.id, edges),
  );
  if (isolated.length === 0) return nodes;

  let maxBottom = 0;

  for (const node of nodes) {
    const { height } = nodeDimensions(node.kind);
    maxBottom = Math.max(maxBottom, node.y + height);
  }

  const isolatedIds = new Set(isolated.map((node) => node.id));
  const sectionStartY = maxBottom + ISOLATED_SECTION_MARGIN;
  const sectionStartX = ISOLATED_EDGE_PADDING;
  const columnStride = RECORD_NODE_WIDTH + ISOLATED_COLUMN_GAP;
  const columns =
    layoutWidth != null
      ? computeIsolatedGridColumns(isolated.length, layoutWidth)
      : 1;

  return nodes.map((node) => {
    if (!isolatedIds.has(node.id)) return node;
    const index = isolated.findIndex((item) => item.id === node.id);
    const column = index % columns;
    const row = Math.floor(index / columns);

    return {
      ...node,
      x: sectionStartX + column * columnStride,
      y: sectionStartY + row * ISOLATED_ROW_GAP,
    };
  });
}
