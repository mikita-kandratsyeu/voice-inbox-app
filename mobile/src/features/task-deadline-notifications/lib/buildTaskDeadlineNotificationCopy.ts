import type { TaskItem } from '@/entities/record';
import { i18n } from '@/shared/lib/i18n';
import { formatTaskDeadlineTimeForDisplay } from '@/shared/lib/taskDeadlineTimeDisplay';

const MAX_TITLE_LENGTH = 120;

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildTaskDeadlineNotificationCopy(
  task: TaskItem,
  recordTitle: string,
): { title: string; body: string } {
  const timeLabel = task.deadlineTime?.trim()
    ? formatTaskDeadlineTimeForDisplay(task.deadlineTime)
    : null;

  const body = timeLabel
    ? i18n.t('taskDeadlineNotifications.bodyWithTime', {
        recordTitle: truncate(recordTitle, 80),
        time: timeLabel,
      })
    : i18n.t('taskDeadlineNotifications.body', {
        recordTitle: truncate(recordTitle, 80),
      });

  return {
    title: truncate(
      task.text.trim() || i18n.t('taskDeadlineNotifications.fallbackTitle'),
      MAX_TITLE_LENGTH,
    ),
    body,
  };
}
