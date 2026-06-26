import * as AddCalendarEvent from 'react-native-add-calendar-event';
import {
  type EventKitPermissionResult,
  NitroEventKitCalendarPermission,
} from 'react-native-nitro-event-kit';

import { IS_IOS } from '@/shared/lib/platform';

export type CreateCalendarEventInput = {
  title: string;
  notes?: string;
  startDateMs: number;
  endDateMs: number;
  scheduleAlarm?: boolean;
  scheduleAlarmMinutesBefore?: number;
};

function isCalendarPermissionGranted(status: EventKitPermissionResult): boolean {
  return status === 'fullAccess' || status === 'writeOnly';
}

async function requestIosCalendarPermission(): Promise<boolean> {
  const current = NitroEventKitCalendarPermission.getPermissionsStatus();
  if (isCalendarPermissionGranted(current)) {
    return true;
  }

  const updated = await NitroEventKitCalendarPermission.requestPermission();
  return isCalendarPermissionGranted(updated);
}

async function presentCalendarEventCreatingDialog(
  input: CreateCalendarEventInput,
): Promise<boolean> {
  const result = await AddCalendarEvent.presentEventCreatingDialog({
    title: input.title,
    startDate: new Date(input.startDateMs).toISOString(),
    endDate: new Date(input.endDateMs).toISOString(),
    notes: input.notes,
  });

  return result?.action === 'SAVED';
}

export async function requestCalendarPermission(): Promise<boolean> {
  if (IS_IOS) {
    return requestIosCalendarPermission();
  }
  return true;
}

export async function addTaskToCalendarEvent(input: CreateCalendarEventInput): Promise<boolean> {
  return presentCalendarEventCreatingDialog(input);
}
