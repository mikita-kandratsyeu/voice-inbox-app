import type { TFunction } from 'i18next';

import type { GraphNode } from '../lib/graphTypes';

export function buildGraphRecordNodeAccessibilityLabel(
  node: GraphNode,
  t: TFunction,
  folderName?: string,
): string | undefined {
  if (node.kind !== 'record' || !node.record) return undefined;

  const record = node.record;
  const openTasks = (record.tasks ?? []).filter((task) => !task.isDone).length;
  const parts = [t('notesGraph.node.a11yRecord', { title: record.title })];

  if (folderName) {
    parts.push(t('notesGraph.node.a11yFolder', { folder: folderName }));
  }

  if (record.status === 'archived') {
    parts.push(t('inbox.filters.archived'));
  }

  if (openTasks > 0) {
    parts.push(t('notesGraph.node.openTasks', { count: openTasks }));
  }

  return parts.join(', ');
}

export function buildGraphTaskNodeAccessibilityLabel(
  node: GraphNode,
  t: TFunction,
): string | undefined {
  if (node.kind !== 'task' || !node.task) return undefined;

  const task = node.task;
  const parts = [t('notesGraph.node.a11yTask', { text: task.text })];

  if (task.isDone) {
    parts.push(t('allTasks.sections.done'));
  } else if (task.priority) {
    parts.push(t(`tasks.priority.${task.priority}`));
  }

  return parts.join(', ');
}

export function buildGraphNodeDotAccessibilityLabel(
  node: GraphNode,
  t: TFunction,
): string | undefined {
  if (node.kind === 'record' && node.record) {
    return t('notesGraph.node.a11yDotRecord', { title: node.record.title });
  }

  if (node.kind === 'task' && node.task) {
    return t('notesGraph.node.a11yDotTask', { text: node.task.text });
  }

  return undefined;
}
