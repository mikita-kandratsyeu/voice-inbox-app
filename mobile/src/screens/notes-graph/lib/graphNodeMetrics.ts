import type { GraphNode } from './graphTypes';
import {
  RECORD_NODE_HEIGHT,
  RECORD_NODE_WIDTH,
  TASK_NODE_HEIGHT,
  TASK_NODE_WIDTH,
} from './graphTypes';

export function nodeDimensions(kind: GraphNode['kind']): { width: number; height: number } {
  if (kind === 'task') {
    return { width: TASK_NODE_WIDTH, height: TASK_NODE_HEIGHT };
  }
  return { width: RECORD_NODE_WIDTH, height: RECORD_NODE_HEIGHT };
}

export function nodeCenter(node: GraphNode): { x: number; y: number } {
  const { width, height } = nodeDimensions(node.kind);
  return { x: node.x + width / 2, y: node.y + height / 2 };
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
