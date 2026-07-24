export const BACKUP_REMINDER_NOTIFICATION_CHANNEL_ID = 'backup-reminders-v1';

export const BACKUP_REMINDER_NOTIFICATION_TYPE = 'backup_reminder';

export const BACKUP_REMINDER_NOTIFICATION_ID_PREFIX = 'backup-reminder:';

/** Keep headroom for task deadline reminders on iOS' 64 pending notification limit. */
export const MAX_BACKUP_REMINDER_NOTIFICATIONS = 8;

export function getBackupReminderNotificationId(index: number): string {
  return `${BACKUP_REMINDER_NOTIFICATION_ID_PREFIX}${index}`;
}

export function isBackupReminderNotificationId(id: string | undefined): boolean {
  return id?.startsWith(BACKUP_REMINDER_NOTIFICATION_ID_PREFIX) ?? false;
}
