/** Bump suffix when Android channel sound/importance changes (channels are immutable). */
export const TASK_DEADLINE_NOTIFICATION_CHANNEL_ID = 'task-deadline-reminders-v2';

export const TASK_DEADLINE_NOTIFICATION_TYPE = 'task_deadline';

/** iOS allows 64 pending trigger notifications; keep headroom for other features. */
export const MAX_TASK_DEADLINE_NOTIFICATIONS = 50;

export const TASK_DEADLINE_NOTIFICATION_ID_PREFIX = 'task-deadline:';

export function getTaskDeadlineNotificationId(taskId: string): string {
  return `${TASK_DEADLINE_NOTIFICATION_ID_PREFIX}${taskId}`;
}

export function isTaskDeadlineNotificationId(id: string | undefined): boolean {
  return id?.startsWith(TASK_DEADLINE_NOTIFICATION_ID_PREFIX) ?? false;
}
