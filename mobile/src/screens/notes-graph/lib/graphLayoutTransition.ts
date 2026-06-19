import type { GraphNode } from './graphTypes';

export type LayoutTransitionState = {
  isTransitioning: boolean;
  oldPositions: Map<string, { x: number; y: number }>;
  newPositions: Map<string, { x: number; y: number }>;
};

export function buildLayoutTransitionMap(
  oldNodes: GraphNode[],
  newNodes: GraphNode[],
): { old: Map<string, { x: number; y: number }>; new: Map<string, { x: number; y: number }> } {
  const old = new Map<string, { x: number; y: number }>();
  const newMap = new Map<string, { x: number; y: number }>();

  for (const node of oldNodes) {
    old.set(node.id, { x: node.x, y: node.y });
  }

  for (const node of newNodes) {
    newMap.set(node.id, { x: node.x, y: node.y });
  }

  return { old, new: newMap };
}

export function interpolateNodePosition(
  nodeId: string,
  progress: number,
  oldPos: Map<string, { x: number; y: number }>,
  newPos: Map<string, { x: number; y: number }>,
): { x: number; y: number } {
  const oldP = oldPos.get(nodeId);
  const newP = newPos.get(nodeId);

  if (!oldP || !newP) {
    return newP ?? oldP ?? { x: 0, y: 0 };
  }

  return {
    x: oldP.x + (newP.x - oldP.x) * progress,
    y: oldP.y + (newP.y - oldP.y) * progress,
  };
}
