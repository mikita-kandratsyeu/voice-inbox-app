import notifee, { AndroidImportance } from '@notifee/react-native';

import { i18n } from '@/shared/lib/i18n';

import { TRANSCRIPTION_PAUSED_NOTIFICATION_CHANNEL_ID } from './constants';

let channelReady = false;

export async function ensureTranscriptionPausedNotificationChannel(): Promise<void> {
  if (channelReady) return;

  await notifee.createChannel({
    id: TRANSCRIPTION_PAUSED_NOTIFICATION_CHANNEL_ID,
    name: i18n.t('settings.taskDeadlineNotificationsChannel'),
    importance: AndroidImportance.DEFAULT,
    sound: 'default',
    vibration: true,
  });

  channelReady = true;
}

export function resetTranscriptionPausedNotificationChannelForTests(): void {
  channelReady = false;
}
