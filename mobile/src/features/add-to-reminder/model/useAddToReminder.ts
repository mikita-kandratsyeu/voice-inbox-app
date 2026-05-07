import Reminders from '@wiicamp/react-native-reminders';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import type { TaskItem } from '@/entities/record';
import { parseTaskDeadline } from '@/shared/lib/parseTaskDeadline';

const FALLBACK_REMINDER_DELAY_MS = 60 * 60 * 1000;
const DEFAULT_REMINDER_HOUR = 9;
const REMINDER_PRIORITY: Record<NonNullable<TaskItem['priority']>, number> = {
  high: 1,
  medium: 5,
  low: 9,
};

const parseDeadlineTime = (
  deadlineTime: TaskItem['deadlineTime'],
): { hours: number; minutes: number } => {
  const match = /^(\d{2}):(\d{2})$/.exec(deadlineTime ?? '');
  if (!match) return { hours: DEFAULT_REMINDER_HOUR, minutes: 0 };

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return { hours: DEFAULT_REMINDER_HOUR, minutes: 0 };

  return { hours, minutes };
};

const getReminderTimestamp = (
  deadline: TaskItem['deadline'],
  deadlineTime: TaskItem['deadlineTime'],
): number => {
  const parsed = parseTaskDeadline(deadline);
  if (!parsed) return Date.now() + FALLBACK_REMINDER_DELAY_MS;
  const { hours, minutes } = parseDeadlineTime(deadlineTime);

  const reminderDate = new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
    hours,
    minutes,
    0,
    0,
  );

  if (reminderDate.getTime() <= Date.now()) {
    return Date.now() + FALLBACK_REMINDER_DELAY_MS;
  }

  return reminderDate.getTime();
};

export function useAddToReminder() {
  const requestPermission = useCallback(async (): Promise<boolean> => {
    return Reminders.requestPermission();
  }, []);

  const addTaskToReminder = useCallback(
    async (
      task: TaskItem,
      recordTitle: string,
      onSuccess?: () => void,
      onPermissionDenied?: (message: string) => void,
    ): Promise<boolean> => {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        onPermissionDenied?.('Reminders access denied');
        return false;
      }

      const timestamp = getReminderTimestamp(task.deadline, task.deadlineTime);
      const priority = task.priority ? REMINDER_PRIORITY[task.priority] : undefined;

      try {
        const reminderConfig = {
          title: task.text,
          note: recordTitle,
          timestamp,
          priority,
        };
        await Reminders.addReminder(reminderConfig);
        onSuccess?.();
        return true;
      } catch (err) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add to Reminders');
        return false;
      }
    },
    [requestPermission],
  );

  return { requestPermission, addTaskToReminder };
}
