import { useCallback } from 'react';
import { Alert } from 'react-native';

import type { TaskItem } from '@/entities/record';
import { addTaskReminder, requestReminderPermission } from '@/shared/lib/native-reminders';
import { getTaskDeadlineTimestamp } from '@/shared/lib/taskDeadlineTimestamp';

const FALLBACK_REMINDER_DELAY_MS = 60 * 60 * 1000;
const REMINDER_PRIORITY: Record<NonNullable<TaskItem['priority']>, number> = {
  high: 1,
  medium: 5,
  low: 9,
};

const getReminderTimestamp = (
  deadline: TaskItem['deadline'],
  deadlineTime: TaskItem['deadlineTime'],
): number => {
  return (
    getTaskDeadlineTimestamp(deadline, deadlineTime) ?? Date.now() + FALLBACK_REMINDER_DELAY_MS
  );
};

export function useAddToReminder() {
  const requestPermission = useCallback(async (): Promise<boolean> => {
    return requestReminderPermission();
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
        await addTaskReminder({
          title: task.text,
          note: recordTitle,
          timestamp,
          priority,
        });
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
