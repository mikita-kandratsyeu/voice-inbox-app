import type { GraphNode } from './graphTypes';

export function graphNodeSearchText(node: Pick<GraphNode, 'kind' | 'record' | 'task'>): string {
  if (node.kind === 'record' && node.record) {
    return node.record.title.toLowerCase();
  }
  if (node.kind === 'task' && node.task) {
    return node.task.text.toLowerCase();
  }
  return '';
}
