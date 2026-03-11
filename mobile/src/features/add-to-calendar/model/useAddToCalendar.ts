import { useCallback } from 'react';
import { Alert } from 'react-native';
import * as AddCalendarEvent from 'react-native-add-calendar-event';
import RNCalendarEvents from 'react-native-calendar-events';

import type { TaskItem } from '@/entities/record';
import { parseTaskDeadline } from '@/shared/lib/parseTaskDeadline';

export function useAddToCalendar() {
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const status = await RNCalendarEvents.requestPermissions();
    return status === 'authorized';
  }, []);

  const addTaskToCalendar = useCallback(
    async (
      task: TaskItem,
      recordTitle: string,
      onSuccess?: () => void,
      onPermissionDenied?: (message: string) => void,
    ): Promise<boolean> => {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        onPermissionDenied?.('Calendar access denied');
        return false;
      }

      const parsed = parseTaskDeadline(task.deadline);
      const startDate = parsed ?? new Date(Date.now() + 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      try {
        const result = await AddCalendarEvent.presentEventCreatingDialog({
          title: task.text,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          notes: recordTitle,
        });
        if (result?.action === 'SAVED') {
          onSuccess?.();
          return true;
        }
        return false;
      } catch (err) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add to Calendar');
        return false;
      }
    },
    [requestPermission],
  );

  return { requestPermission, addTaskToCalendar };
}
