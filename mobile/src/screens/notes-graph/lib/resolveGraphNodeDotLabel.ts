import type { GraphNode } from './graphTypes';

export function resolveGraphNodeDotLabel(
  node: Pick<GraphNode, 'kind' | 'record' | 'task'>,
): string | null {
  const raw =
    node.kind === 'record' && node.record
      ? node.record.title
      : node.kind === 'task' && node.task
        ? node.task.text
        : '';
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}
