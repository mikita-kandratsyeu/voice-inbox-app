import type { GraphMinimapFrame } from './graphMinimapFrame';
import { worldToMinimapPoint } from './graphMinimapFrame';
import { nodeBounds } from './graphNodeMetrics';
import type { GraphNode } from './graphTypes';

export type MinimapNodeItem = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  glowCx: number;
  glowCy: number;
  glowRadius: number;
  showGlow: boolean;
};

export function buildMinimapNodeItems(
  nodes: GraphNode[],
  frame: GraphMinimapFrame,
): MinimapNodeItem[] {
  return nodes.map((node) => {
    const bounds = nodeBounds(node);
    const topLeft = worldToMinimapPoint(bounds.left, bounds.top, frame);
    const width = Math.max(3, (bounds.right - bounds.left) * frame.scale);
    const height = Math.max(3, (bounds.bottom - bounds.top) * frame.scale);
    const showGlow = width > 5 && height > 5;
    const glowRadius = Math.max(width, height) * 0.8;

    return {
      id: node.id,
      x: topLeft.x,
      y: topLeft.y,
      width,
      height,
      glowCx: topLeft.x + width / 2,
      glowCy: topLeft.y + height / 2,
      glowRadius,
      showGlow,
    };
  });
}
