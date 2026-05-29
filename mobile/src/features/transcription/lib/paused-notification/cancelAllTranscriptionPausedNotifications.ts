import notifee from '@notifee/react-native';

import { isTranscriptionPausedNotificationId } from './constants';

export async function cancelAllTranscriptionPausedNotifications(): Promise<void> {
  const displayed = await notifee.getDisplayedNotifications();
  await Promise.all(
    displayed
      .filter((item) => isTranscriptionPausedNotificationId(item.id))
      .map((item) => notifee.cancelNotification(item.id!)),
  );
}
