import dayjs from 'dayjs';

import { parseTaskDeadline } from '@/shared/lib/parseTaskDeadline';

import type { TaskWithRecord } from '../types';

export type TaskDeadlineDayMarker = {
  hasOverdue: boolean;
};

/** Fixed marker colors — same in light and dark themes (iOS system blue / red). */
export const CALENDAR_TASK_MARKER_COLOR = '#0A84FF';
export const CALENDAR_OVERDUE_MARKER_COLOR = '#FF453A';

export function getTaskMarkerDotColor(marker: TaskDeadlineDayMarker | undefined): string | null {
  if (!marker) return null;
  return marker.hasOverdue ? CALENDAR_OVERDUE_MARKER_COLOR : CALENDAR_TASK_MARKER_COLOR;
}

export function buildTaskDeadlineDayMarkers(
  rows: TaskWithRecord[],
): Map<string, TaskDeadlineDayMarker> {
  const today = dayjs().startOf('day');
  const markers = new Map<string, TaskDeadlineDayMarker>();

  for (const row of rows) {
    const deadline = parseTaskDeadline(row.task.deadline);
    if (!deadline) continue;

    const key = dayjs(deadline).format('YYYY-MM-DD');
    const isOverdue = !row.task.isDone && dayjs(deadline).startOf('day').isBefore(today);
    const existing = markers.get(key);

    if (existing) {
      if (isOverdue) existing.hasOverdue = true;
      continue;
    }

    markers.set(key, { hasOverdue: isOverdue });
  }

  return markers;
}
