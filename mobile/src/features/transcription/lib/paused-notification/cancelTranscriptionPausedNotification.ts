import notifee from '@notifee/react-native';

import { getTranscriptionPausedNotificationId } from './constants';

export async function cancelTranscriptionPausedNotification(recordId: string): Promise<void> {
  await notifee.cancelNotification(getTranscriptionPausedNotificationId(recordId));
}
