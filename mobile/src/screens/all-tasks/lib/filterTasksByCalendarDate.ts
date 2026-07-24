import dayjs from 'dayjs';

import { parseTaskDeadline } from '@/shared/lib/parseTaskDeadline';

import type { TaskWithRecord } from '../types';

export function filterTasksByCalendarDate(rows: TaskWithRecord[], date: Date): TaskWithRecord[] {
  const target = dayjs(date).startOf('day');

  return rows.filter((row) => {
    const deadline = parseTaskDeadline(row.task.deadline);
    if (!deadline) return false;
    return dayjs(deadline).startOf('day').isSame(target);
  });
}

export function buildTaskCountsByDeadlineDay(rows: TaskWithRecord[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const deadline = parseTaskDeadline(row.task.deadline);
    if (!deadline) continue;

    const key = dayjs(deadline).format('YYYY-MM-DD');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}
