import { GRAPH_NODE_DOT_CONTAINER_SIZE, GRAPH_NODE_DOT_SIZE_ACTIVE } from './graphNodeDotLayout';
import type { GraphNode, GraphNodeDisplayMode, GraphNodeLOD } from './graphTypes';
import {
  RECORD_NODE_HEIGHT,
  RECORD_NODE_HEIGHT_COMPACT,
  RECORD_NODE_WIDTH,
  RECORD_NODE_WIDTH_COMPACT,
  TASK_NODE_HEIGHT,
  TASK_NODE_HEIGHT_COMPACT,
  TASK_NODE_WIDTH,
  TASK_NODE_WIDTH_COMPACT,
} from './graphTypes';

const dimensionsCache = new Map<GraphNode['kind'], { width: number; height: number }>([
  ['task', { width: TASK_NODE_WIDTH, height: TASK_NODE_HEIGHT }],
  ['record', { width: RECORD_NODE_WIDTH, height: RECORD_NODE_HEIGHT }],
]);

const compactDimensionsCache = new Map<GraphNode['kind'], { width: number; height: number }>([
  ['task', { width: TASK_NODE_WIDTH_COMPACT, height: TASK_NODE_HEIGHT_COMPACT }],
  ['record', { width: RECORD_NODE_WIDTH_COMPACT, height: RECORD_NODE_HEIGHT_COMPACT }],
]);

export function nodeDimensions(
  kind: GraphNode['kind'],
  lod: GraphNodeLOD = 'full',
): { width: number; height: number } {
  if (lod === 'compact') {
    return compactDimensionsCache.get(kind)!;
  }
  return dimensionsCache.get(kind)!;
}

export function nodeCenter(
  node: GraphNode,
  displayMode: GraphNodeDisplayMode = 'cards',
): { x: number; y: number } {
  if (displayMode === 'dots') {
    return {
      x: node.x + GRAPH_NODE_DOT_CONTAINER_SIZE / 2,
      y: node.y + GRAPH_NODE_DOT_CONTAINER_SIZE / 2,
    };
  }
  const { width, height } = nodeDimensions(node.kind);
  return { x: node.x + width / 2, y: node.y + height / 2 };
}

/** Point where an edge should meet the node card border, facing `toward`. */
export function nodeBorderAnchor(
  node: GraphNode,
  toward: { x: number; y: number },
  displayMode: GraphNodeDisplayMode = 'cards',
): { x: number; y: number } {
  if (displayMode === 'dots') {
    const dotRadius = GRAPH_NODE_DOT_SIZE_ACTIVE / 2;
    const cx = node.x + GRAPH_NODE_DOT_CONTAINER_SIZE / 2;
    const cy = node.y + GRAPH_NODE_DOT_CONTAINER_SIZE / 2;
    const dx = toward.x - cx;
    const dy = toward.y - cy;
    const distance = Math.hypot(dx, dy);

    if (distance < 0.001) {
      return { x: cx, y: cy };
    }

    return {
      x: cx + (dx / distance) * dotRadius,
      y: cy + (dy / distance) * dotRadius,
    };
  }

  const { width, height } = nodeDimensions(node.kind);
  const cx = node.x + width / 2;
  const cy = node.y + height / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;

  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    return { x: cx, y: cy };
  }

  const halfW = width / 2;
  const halfH = height / 2;
  const scale = Math.min(halfW / Math.abs(dx), halfH / Math.abs(dy));
  return { x: cx + dx * scale, y: cy + dy * scale };
}

export function nodeBounds(node: GraphNode): {
  left: number;
  top: number;
  right: number;
  bottom: number;
} {
  const { width, height } = nodeDimensions(node.kind);
  return {
    left: node.x,
    top: node.y,
    right: node.x + width,
    bottom: node.y + height,
  };
}
