import { parseTaskDeadline } from '@/shared/lib/parseTaskDeadline';

export const DEFAULT_TASK_DEADLINE_HOUR = 9;

export function parseTaskDeadlineTimeOfDay(deadlineTime: string | null | undefined): {
  hours: number;
  minutes: number;
} {
  const match = /^(\d{2}):(\d{2})$/.exec(deadlineTime ?? '');
  if (!match) {
    return { hours: DEFAULT_TASK_DEADLINE_HOUR, minutes: 0 };
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    return { hours: DEFAULT_TASK_DEADLINE_HOUR, minutes: 0 };
  }

  return { hours, minutes };
}

/** Returns a future local timestamp for the task deadline, or null when missing / already passed. */
export function getTaskDeadlineTimestamp(
  deadline: string | null | undefined,
  deadlineTime: string | null | undefined,
  nowMs: number = Date.now(),
): number | null {
  const parsed = parseTaskDeadline(deadline);
  if (!parsed) return null;

  const { hours, minutes } = parseTaskDeadlineTimeOfDay(deadlineTime);
  const reminderDate = new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
    hours,
    minutes,
    0,
    0,
  );

  if (reminderDate.getTime() <= nowMs) {
    return null;
  }

  return reminderDate.getTime();
}
