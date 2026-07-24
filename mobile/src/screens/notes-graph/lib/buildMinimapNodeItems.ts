import type { GraphMinimapFrame } from './graphMinimapFrame';
import { worldToMinimapPoint } from './graphMinimapFrame';
import { nodeBounds } from './graphNodeMetrics';
import type { GraphNode } from './graphTypes';

const MIN_NODE_SIZE = 3;
const GLOW_THRESHOLD = 5;
const GLOW_RADIUS_SCALE = 0.8;

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
    const width = Math.max(MIN_NODE_SIZE, (bounds.right - bounds.left) * frame.scale);
    const height = Math.max(MIN_NODE_SIZE, (bounds.bottom - bounds.top) * frame.scale);
    const showGlow = width > GLOW_THRESHOLD && height > GLOW_THRESHOLD;
    const glowRadius = Math.max(width, height) * GLOW_RADIUS_SCALE;

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
