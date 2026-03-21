import type { TaskItem } from './types';

const isManualTask = (t: TaskItem) => t.source === 'manual' || t.id.includes('-manual-');

export const mergeManualTasksWithAi = (
  currentTasks: TaskItem[] | undefined,
  aiTasks: TaskItem[],
): TaskItem[] => {
  const manual = (currentTasks ?? []).filter(isManualTask);
  return [...manual, ...aiTasks];
};
