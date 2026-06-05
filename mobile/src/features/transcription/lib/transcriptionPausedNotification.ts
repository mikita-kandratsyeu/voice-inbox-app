import notifee, { AndroidImportance, type Event, EventType } from '@notifee/react-native';
import { AppState } from 'react-native';

import { useRecordStore } from '@/entities/record';
import { i18n } from '@/shared/lib/i18n';
import { isString } from '@/shared/lib/type-guards';

import { requestTranscriptionResumePrompt } from '../model/transcriptionResumePromptRequest';
import { getTranscriptionCheckpoint } from './transcriptionCheckpoint';

const TRANSCRIPTION_PAUSED_NOTIFICATION_CHANNEL_ID = 'transcription-paused-v1';
const TRANSCRIPTION_PAUSED_NOTIFICATION_TYPE = 'transcription_paused';
const TRANSCRIPTION_PAUSED_NOTIFICATION_ID_PREFIX = 'transcription-paused:';

let channelReady = false;
const shownNotificationRecordIds = new Set<string>();

function getTranscriptionPausedNotificationId(recordId: string): string {
  return `${TRANSCRIPTION_PAUSED_NOTIFICATION_ID_PREFIX}${recordId}`;
}

async function ensureTranscriptionPausedNotificationChannel(): Promise<void> {
  if (channelReady) {
    return;
  }

  await notifee.createChannel({
    id: TRANSCRIPTION_PAUSED_NOTIFICATION_CHANNEL_ID,
    name: i18n.t('transcription.pausedNotificationChannel'),
    importance: AndroidImportance.DEFAULT,
    sound: 'default',
    vibration: true,
  });

  channelReady = true;
}

export async function cancelTranscriptionPausedNotification(recordId: string): Promise<void> {
  shownNotificationRecordIds.delete(recordId);
  await notifee.cancelNotification(getTranscriptionPausedNotificationId(recordId));
}

export async function showTranscriptionPausedNotification(input: {
  recordId: string;
  recordTitle: string;
  checkpointVerified?: boolean;
}): Promise<void> {
  if (shownNotificationRecordIds.has(input.recordId)) {
    return;
  }

  if (AppState.currentState === 'active') {
    return;
  }

  if (input.checkpointVerified !== true) {
    const checkpoint = await getTranscriptionCheckpoint(input.recordId);
    if (!checkpoint) {
      return;
    }
  }

  const settings = await notifee.getNotificationSettings();
  if (settings.authorizationStatus < 1) {
    return;
  }

  await ensureTranscriptionPausedNotificationChannel();
  const recordTitle = input.recordTitle.trim();
  const notificationId = getTranscriptionPausedNotificationId(input.recordId);
  await notifee.displayNotification({
    id: notificationId,
    title: i18n.t('transcription.pausedNotificationTitle'),
    body: recordTitle
      ? i18n.t('transcription.pausedNotificationBody', { title: recordTitle })
      : i18n.t('transcription.pausedNotificationBodyFallback'),
    data: {
      type: TRANSCRIPTION_PAUSED_NOTIFICATION_TYPE,
      recordId: input.recordId,
    },
    android: {
      channelId: TRANSCRIPTION_PAUSED_NOTIFICATION_CHANNEL_ID,
      pressAction: { id: 'default' },
      sound: 'default',
    },
    ios: {
      sound: 'default',
    },
  });
  shownNotificationRecordIds.add(input.recordId);
}

type TranscriptionPausedNotificationPressDeps = {
  navigateToRecord: (recordId: string) => void;
};

function extractTranscriptionPausedPressData(
  data: Record<string, string | number | object> | undefined,
): { recordId: string } | null {
  if (!data || data.type !== TRANSCRIPTION_PAUSED_NOTIFICATION_TYPE) return null;

  const recordId = isString(data.recordId) ? data.recordId.trim() : '';
  if (!recordId) return null;

  return { recordId };
}

export function handleTranscriptionPausedNotificationData(
  data: Record<string, string | number | object> | undefined,
  deps: TranscriptionPausedNotificationPressDeps,
): void {
  const payload = extractTranscriptionPausedPressData(data);
  if (!payload) return;

  const record = useRecordStore.getState().records.find((item) => item.id === payload.recordId);
  if (!record?.audioPath) return;

  void cancelTranscriptionPausedNotification(payload.recordId).catch(() => {});
  requestTranscriptionResumePrompt(payload.recordId);
  deps.navigateToRecord(payload.recordId);
}

export function handleTranscriptionPausedNotificationPress(
  event: Event,
  deps: TranscriptionPausedNotificationPressDeps,
): void {
  if (event.type !== EventType.PRESS && event.type !== EventType.ACTION_PRESS) return;
  handleTranscriptionPausedNotificationData(event.detail.notification?.data, deps);
}

export function createTranscriptionPausedNotificationPressHandler(
  deps: TranscriptionPausedNotificationPressDeps,
): (event: Event) => void {
  return (event) => {
    handleTranscriptionPausedNotificationPress(event, deps);
  };
}
