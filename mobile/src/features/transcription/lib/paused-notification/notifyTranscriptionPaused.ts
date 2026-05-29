import notifee from '@notifee/react-native';

import { useSettingsStore } from '@/entities/settings';
import { checkTaskNotificationPermission } from '@/features/task-deadline-notifications';

import {
  getTranscriptionPausedNotificationId,
  TRANSCRIPTION_PAUSED_NOTIFICATION_CHANNEL_ID,
  TRANSCRIPTION_PAUSED_NOTIFICATION_TYPE,
} from './constants';
import { buildTranscriptionPausedNotificationCopy } from './buildTranscriptionPausedNotificationCopy';
import { ensureTranscriptionPausedNotificationChannel } from './ensureTranscriptionPausedNotificationChannel';

export async function notifyTranscriptionPaused(input: {
  recordId: string;
  recordTitle: string;
}): Promise<void> {
  if (!useSettingsStore.getState().taskDeadlineNotificationsEnabled) return;

  const permission = await checkTaskNotificationPermission();
  if (permission !== 'granted') return;

  await ensureTranscriptionPausedNotificationChannel();

  const { title, body } = buildTranscriptionPausedNotificationCopy(input.recordTitle);

  await notifee.displayNotification({
    id: getTranscriptionPausedNotificationId(input.recordId),
    title,
    body,
    data: {
      type: TRANSCRIPTION_PAUSED_NOTIFICATION_TYPE,
      recordId: input.recordId,
    },
    android: {
      channelId: TRANSCRIPTION_PAUSED_NOTIFICATION_CHANNEL_ID,
      pressAction: { id: 'default' },
      sound: 'default',
      autoCancel: true,
    },
    ios: {
      sound: 'default',
    },
  });
}
