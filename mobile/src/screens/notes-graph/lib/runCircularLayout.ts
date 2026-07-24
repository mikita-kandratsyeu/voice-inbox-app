import { nodeDimensions } from './graphNodeMetrics';
import type { GraphEdge, GraphNode } from './graphTypes';
import { orderGraphNodesForCircularLayout } from './orderGraphNodesForCircularLayout';

const CIRCULAR_EDGE_PADDING = 72;
const CIRCULAR_NODE_GAP = 20;
const AVG_NODE_SPAN = 188;
const MULTI_RING_THRESHOLD = 40; // Use multi-ring for 40+ nodes
const NODES_PER_RING = 24; // Optimal nodes per ring for readability

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

/**
 * Layout nodes in multiple concentric rings (Saturn rings style 🪐).
 * Used for large graphs (40+ nodes) to prevent overcrowding in a single ring.
 */
function layoutNodesInMultipleRings(
  orderedNodes: GraphNode[],
  centerX: number,
  centerY: number,
  layoutWidth: number,
  layoutHeight: number,
  fixedPositions?: Map<string, { x: number; y: number }>,
): GraphNode[] {
  const totalNodes = orderedNodes.length;
  const ringCount = Math.ceil(totalNodes / NODES_PER_RING);

  // Base radius for innermost ring
  const minDimension = Math.min(layoutWidth, layoutHeight);
  const baseRadius = minDimension * 0.18; // Start at 18% of viewport
  const ringSpacing = minDimension * 0.12; // 12% spacing between rings

  const result: GraphNode[] = [];
  let nodeIndex = 0;

  for (let ring = 0; ring < ringCount; ring++) {
    const nodesInThisRing = Math.min(NODES_PER_RING, totalNodes - nodeIndex);
    if (nodesInThisRing === 0) break;

    const radius = baseRadius + ring * ringSpacing;
    const angleStep = (2 * Math.PI) / nodesInThisRing;
    const startAngle = -Math.PI / 2 + (ring % 2 === 0 ? 0 : angleStep / 2); // Offset alternate rings

    for (let i = 0; i < nodesInThisRing; i++) {
      const node = orderedNodes[nodeIndex++];
      if (!node) break;

      const fixed = fixedPositions?.get(node.id);
      if (fixed) {
        result.push({ ...node, x: fixed.x, y: fixed.y });
        continue;
      }

      const angle = startAngle + i * angleStep;
      const { width, height } = nodeDimensions(node.kind);

      result.push({
        ...node,
        x: centerX + radius * Math.cos(angle) - width / 2,
        y: centerY + radius * Math.sin(angle) - height / 2,
      });
    }
  }

  return result;
}

export function layoutNodesInCircle(
  nodes: GraphNode[],
  layoutWidth: number,
  layoutHeight: number,
  fixedPositions?: Map<string, { x: number; y: number }>,
  edges: GraphEdge[] = [],
): GraphNode[] {
  const orderedNodes = orderGraphNodesForCircularLayout(nodes, edges);

  if (orderedNodes.length === 0) return nodes;

  const centerX = layoutWidth / 2;
  const centerY = layoutHeight / 2;

  if (orderedNodes.length === 1) {
    const node = orderedNodes[0]!;
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

  // Use multi-ring layout for large graphs (Saturn rings style 🪐)
  if (orderedNodes.length >= MULTI_RING_THRESHOLD) {
    return layoutNodesInMultipleRings(
      orderedNodes,
      centerX,
      centerY,
      layoutWidth,
      layoutHeight,
      fixedPositions,
    );
  }

  // Single ring for smaller graphs
  const radius = computeCircularRadius(orderedNodes.length, layoutWidth, layoutHeight);
  const angleStep = (2 * Math.PI) / orderedNodes.length;
  const startAngle = -Math.PI / 2;

  return orderedNodes.map((node, index) => {
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
