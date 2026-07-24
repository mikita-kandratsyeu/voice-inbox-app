import type { TaskItem } from '@/entities/record';

import type { TaskCompletionInput } from './types';

const OUTCOME_TEXT_MAX_CHARS = 2000;

export function normalizeOutcomeText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  return trimmed.slice(0, OUTCOME_TEXT_MAX_CHARS);
}

export function applyTaskCompletion(task: TaskItem, input: TaskCompletionInput = {}): TaskItem {
  const outcomeText = normalizeOutcomeText(input.outcomeText ?? task.outcomeText);
  const outcomeRecordId = input.outcomeRecordId?.trim() || task.outcomeRecordId?.trim() || null;

  return {
    ...task,
    isDone: true,
    completedAt: task.completedAt ?? new Date().toISOString(),
    outcomeText,
    outcomeRecordId,
  };
}

export function applyTaskReopen(task: TaskItem): TaskItem {
  return {
    ...task,
    isDone: false,
    completedAt: null,
    outcomeText: null,
    outcomeRecordId: null,
  };
}

export function patchTaskInList(
  tasks: TaskItem[],
  taskId: string,
  patch: (task: TaskItem) => TaskItem,
): TaskItem[] {
  return tasks.map((task) => (task.id === taskId ? patch(task) : task));
}
