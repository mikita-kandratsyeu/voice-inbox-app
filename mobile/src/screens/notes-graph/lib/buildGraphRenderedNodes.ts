import type { GraphViewportCull } from './buildGraphRenderedEdges';
import type { GraphNode } from './graphTypes';
import { RECORD_NODE_WIDTH, TASK_NODE_WIDTH } from './graphTypes';

/**
 * Filter nodes to only those visible in the current viewport.
 * This is a critical optimization that prevents rendering hundreds of off-screen nodes.
 *
 * @param nodes All nodes in the graph
 * @param viewportCull Viewport transform (translateX, translateY, scale, viewportWidth, viewportHeight)
 * @param buffer Extra margin in pixels to render outside viewport (prevents pop-in during pan)
 * @returns Only nodes visible in viewport + buffer zone
 */
export function buildGraphRenderedNodes(
  nodes: GraphNode[],
  viewportCull: GraphViewportCull,
  buffer = 300,
): GraphNode[] {
  const { translateX, translateY, scale, viewportWidth, viewportHeight } = viewportCull;

  // Convert viewport bounds to world coordinates
  const viewMinX = -translateX / scale - buffer;
  const viewMaxX = (-translateX + viewportWidth) / scale + buffer;
  const viewMinY = -translateY / scale - buffer;
  const viewMaxY = (-translateY + viewportHeight) / scale + buffer;

  const visible: GraphNode[] = [];

  for (const node of nodes) {
    const nodeWidth = node.kind === 'record' ? RECORD_NODE_WIDTH : TASK_NODE_WIDTH;
    const nodeHeight = nodeWidth; // Nodes are square

    // Check if node bounds intersect with viewport bounds
    const nodeRight = node.x + nodeWidth;
    const nodeBottom = node.y + nodeHeight;

    const isVisible =
      nodeRight > viewMinX && node.x < viewMaxX && nodeBottom > viewMinY && node.y < viewMaxY;

    if (isVisible) {
      visible.push(node);
    }
  }

  return visible;
}
