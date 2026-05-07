import { useCallback } from 'react';
import { Alert } from 'react-native';
import * as AddCalendarEvent from 'react-native-add-calendar-event';
import RNCalendarEvents from 'react-native-calendar-events';

import type { TaskItem } from '@/entities/record';
import { parseTaskDeadline } from '@/shared/lib/parseTaskDeadline';

const DEFAULT_EVENT_HOUR = 9;

const parseDeadlineTime = (
  deadlineTime: TaskItem['deadlineTime'],
): { hours: number; minutes: number } => {
  const match = /^(\d{2}):(\d{2})$/.exec(deadlineTime ?? '');
  if (!match) return { hours: DEFAULT_EVENT_HOUR, minutes: 0 };

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return { hours: DEFAULT_EVENT_HOUR, minutes: 0 };

  return { hours, minutes };
};

const getEventStartDate = (task: TaskItem): Date => {
  const parsed = parseTaskDeadline(task.deadline);
  if (!parsed) return new Date(Date.now() + 60 * 60 * 1000);
  const { hours, minutes } = parseDeadlineTime(task.deadlineTime);

  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), hours, minutes);
};

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

      const startDate = getEventStartDate(task);
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
