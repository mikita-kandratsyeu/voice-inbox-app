import { DEFAULT_TASK_DEADLINE_HOUR } from '@/shared/lib/taskDeadlineTimestamp';

export const TASK_DEADLINE_SNOOZE_15M_MS = 15 * 60 * 1000;
export const TASK_DEADLINE_SNOOZE_1H_MS = 60 * 60 * 1000;

export function resolveTaskDeadlineTriggerAt(
  deadlineAt: number | null,
  snoozeAt: number | undefined,
  nowMs: number,
): number | null {
  const activeSnooze = snoozeAt != null && snoozeAt > nowMs ? snoozeAt : null;
  const activeDeadline = deadlineAt != null && deadlineAt > nowMs ? deadlineAt : null;

  if (activeDeadline != null && activeSnooze != null) {
    return Math.max(activeDeadline, activeSnooze);
  }

  return activeDeadline ?? activeSnooze;
}

export function getTaskDeadlineSnoozeTriggerAt(
  offsetMs: number,
  nowMs: number = Date.now(),
): number {
  return nowMs + offsetMs;
}

export function getTaskDeadlineTomorrowMorningTriggerAt(nowMs: number = Date.now()): number {
  const date = new Date(nowMs);
  date.setDate(date.getDate() + 1);
  date.setHours(DEFAULT_TASK_DEADLINE_HOUR, 0, 0, 0);
  return date.getTime();
}
