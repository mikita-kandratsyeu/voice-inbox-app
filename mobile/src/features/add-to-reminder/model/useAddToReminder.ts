import Reminders from '@wiicamp/react-native-reminders';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import type { TaskItem } from '@/entities/record';
import { parseTaskDeadline } from '@/shared/lib/parseTaskDeadline';

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

      const parsed = parseTaskDeadline(task.deadline);
      const timestamp = parsed ? parsed.getTime() : Date.now() + 60 * 60 * 1000;

      try {
        await Reminders.addReminder({
          title: task.text,
          note: recordTitle,
          timestamp,
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
