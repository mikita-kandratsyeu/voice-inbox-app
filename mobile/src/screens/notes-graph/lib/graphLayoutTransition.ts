import type { GraphNode } from './graphTypes';

export const GRAPH_LAYOUT_TRANSITION_MS = 280;

const MIN_NODE_OVERLAP_RATIO = 0.5;

export type LayoutTransitionMaps = {
  old: Map<string, { x: number; y: number }>;
  new: Map<string, { x: number; y: number }>;
};

export function buildLayoutTransitionMap(
  oldNodes: GraphNode[],
  newNodes: GraphNode[],
): LayoutTransitionMaps {
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

export function shouldAnimateLayoutTransition(
  oldNodes: GraphNode[],
  newNodes: GraphNode[],
): boolean {
  if (oldNodes.length === 0 || newNodes.length === 0) return false;

  const oldIds = new Set(oldNodes.map((node) => node.id));
  let overlap = 0;

  for (const node of newNodes) {
    if (oldIds.has(node.id)) overlap += 1;
  }

  return overlap / newNodes.length >= MIN_NODE_OVERLAP_RATIO;
}

export function interpolateLayoutNodes(
  targetNodes: GraphNode[],
  progress: number,
  maps: LayoutTransitionMaps,
): GraphNode[] {
  const eased = easeOutCubic(progress);

  return targetNodes.map((node) => {
    const position = interpolateNodePosition(node.id, eased, maps.old, maps.new);
    if (node.x === position.x && node.y === position.y) return node;
    return { ...node, x: position.x, y: position.y };
  });
}

function easeOutCubic(progress: number): number {
  const t = Math.max(0, Math.min(1, progress));
  return 1 - (1 - t) ** 3;
}

export function runLayoutTransition(
  fromNodes: GraphNode[],
  toNodes: GraphNode[],
  durationMs: number,
  onFrame: (nodes: GraphNode[]) => void,
  onComplete: () => void,
): () => void {
  const maps = buildLayoutTransitionMap(fromNodes, toNodes);
  const startedAt = Date.now();
  let frameId: number | null = null;
  let cancelled = false;

  const tick = () => {
    if (cancelled) return;

    const elapsed = Date.now() - startedAt;
    const progress = durationMs <= 0 ? 1 : Math.min(1, elapsed / durationMs);
    onFrame(interpolateLayoutNodes(toNodes, progress, maps));

    if (progress < 1) {
      frameId = requestAnimationFrame(tick);
      return;
    }

    frameId = null;
    onComplete();
  };

  frameId = requestAnimationFrame(tick);

  return () => {
    cancelled = true;
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  };
}
