import { nodeDimensions } from './graphNodeMetrics';
import type { GraphNode } from './graphTypes';

const CIRCULAR_EDGE_PADDING = 72;
const CIRCULAR_NODE_GAP = 20;
const AVG_NODE_SPAN = 188;

function computeCircularRadius(
  nodeCount: number,
  layoutWidth: number,
  layoutHeight: number,
): number {
  if (nodeCount <= 1) return 0;

  const maxRadius = Math.min(layoutWidth, layoutHeight) / 2 - CIRCULAR_EDGE_PADDING;
  const spacingRadius = (nodeCount * (AVG_NODE_SPAN + CIRCULAR_NODE_GAP)) / (2 * Math.PI);

  return Math.min(maxRadius, Math.max(spacingRadius, 56));
}

export function layoutNodesInCircle(
  nodes: GraphNode[],
  layoutWidth: number,
  layoutHeight: number,
  fixedPositions?: Map<string, { x: number; y: number }>,
): GraphNode[] {
  if (nodes.length === 0) return nodes;

  const centerX = layoutWidth / 2;
  const centerY = layoutHeight / 2;

  if (nodes.length === 1) {
    const node = nodes[0]!;
    const { width, height } = nodeDimensions(node.kind);
    const fixed = fixedPositions?.get(node.id);
    return [
      {
        ...node,
        x: fixed?.x ?? centerX - width / 2,
        y: fixed?.y ?? centerY - height / 2,
      },
    ];
  }

  const radius = computeCircularRadius(nodes.length, layoutWidth, layoutHeight);
  const angleStep = (2 * Math.PI) / nodes.length;
  const startAngle = -Math.PI / 2;

  return nodes.map((node, index) => {
    const fixed = fixedPositions?.get(node.id);
    if (fixed) return { ...node, x: fixed.x, y: fixed.y };

    const angle = startAngle + index * angleStep;
    const { width, height } = nodeDimensions(node.kind);

    return {
      ...node,
      x: centerX + radius * Math.cos(angle) - width / 2,
      y: centerY + radius * Math.sin(angle) - height / 2,
    };
  });
}
