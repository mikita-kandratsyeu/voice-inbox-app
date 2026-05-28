import notifee from '@notifee/react-native';

import { IS_IOS } from '@/shared/lib/platform';

export type TaskNotificationPermissionStatus = 'granted' | 'denied' | 'not-determined';

export async function checkTaskNotificationPermission(): Promise<TaskNotificationPermissionStatus> {
  const settings = await notifee.getNotificationSettings();

  if (settings.authorizationStatus >= 1) {
    return 'granted';
  }

  if (settings.authorizationStatus === 0) {
    return IS_IOS ? 'not-determined' : 'denied';
  }

  return 'denied';
}

export async function requestTaskNotificationPermission(): Promise<TaskNotificationPermissionStatus> {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= 1 ? 'granted' : 'denied';
}
