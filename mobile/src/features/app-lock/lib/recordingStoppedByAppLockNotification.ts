import notifee, { AndroidImportance, type Event, EventType } from '@notifee/react-native';
import { AppState } from 'react-native';

import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { i18n } from '@/shared/lib/i18n';
import { isString } from '@/shared/lib/type-guards';

const RECORDING_STOPPED_BY_APP_LOCK_CHANNEL_ID = 'recording-stopped-app-lock-v1';
const RECORDING_STOPPED_BY_APP_LOCK_NOTIFICATION_TYPE = 'recording_stopped_app_lock';
const RECORDING_STOPPED_BY_APP_LOCK_NOTIFICATION_ID_PREFIX = 'recording-stopped-app-lock:';

let channelReady = false;
const shownNotificationRecordIds = new Set<string>();

function getRecordingStoppedByAppLockNotificationId(recordId: string): string {
  return `${RECORDING_STOPPED_BY_APP_LOCK_NOTIFICATION_ID_PREFIX}${recordId}`;
}

async function ensureRecordingStoppedByAppLockNotificationChannel(): Promise<void> {
  if (channelReady) {
    return;
  }

  await notifee.createChannel({
    id: RECORDING_STOPPED_BY_APP_LOCK_CHANNEL_ID,
    name: i18n.t('record.appLockSavedNotificationChannel'),
    importance: AndroidImportance.DEFAULT,
    sound: 'default',
    vibration: true,
  });

  channelReady = true;
}

export async function cancelRecordingStoppedByAppLockNotification(recordId: string): Promise<void> {
  shownNotificationRecordIds.delete(recordId);
  await notifee.cancelNotification(getRecordingStoppedByAppLockNotificationId(recordId));
}

export async function showRecordingStoppedByAppLockNotification(input: {
  recordId: string;
  recordTitle: string;
}): Promise<void> {
  if (!useSettingsStore.getState().appLockRecordingNotificationsEnabled) {
    return;
  }

  if (shownNotificationRecordIds.has(input.recordId)) {
    return;
  }

  if (AppState.currentState === 'active') {
    return;
  }

  const settings = await notifee.getNotificationSettings();
  if (settings.authorizationStatus < 1) {
    return;
  }

  await ensureRecordingStoppedByAppLockNotificationChannel();
  const recordTitle = input.recordTitle.trim();
  const notificationId = getRecordingStoppedByAppLockNotificationId(input.recordId);
  await notifee.displayNotification({
    id: notificationId,
    title: i18n.t('record.appLockSavedNotificationTitle'),
    body: recordTitle
      ? i18n.t('record.appLockSavedNotificationBody', { title: recordTitle })
      : i18n.t('record.appLockSavedNotificationBodyFallback'),
    data: {
      type: RECORDING_STOPPED_BY_APP_LOCK_NOTIFICATION_TYPE,
      recordId: input.recordId,
    },
    android: {
      channelId: RECORDING_STOPPED_BY_APP_LOCK_CHANNEL_ID,
      pressAction: { id: 'default' },
      sound: 'default',
    },
    ios: {
      sound: 'default',
    },
  });
  shownNotificationRecordIds.add(input.recordId);
}

type RecordingStoppedByAppLockNotificationPressDeps = {
  navigateToRecord: (recordId: string) => void;
};

function extractRecordingStoppedByAppLockPressData(
  data: Record<string, string | number | object> | undefined,
): { recordId: string } | null {
  if (!data || data.type !== RECORDING_STOPPED_BY_APP_LOCK_NOTIFICATION_TYPE) return null;

  const recordId = isString(data.recordId) ? data.recordId.trim() : '';
  if (!recordId) return null;

  return { recordId };
}

export function handleRecordingStoppedByAppLockNotificationData(
  data: Record<string, string | number | object> | undefined,
  deps: RecordingStoppedByAppLockNotificationPressDeps,
): void {
  const payload = extractRecordingStoppedByAppLockPressData(data);
  if (!payload) return;

  const record = useRecordStore.getState().records.find((item) => item.id === payload.recordId);
  if (!record?.audioPath) return;

  void cancelRecordingStoppedByAppLockNotification(payload.recordId).catch(() => {});
  deps.navigateToRecord(payload.recordId);
}

export function handleRecordingStoppedByAppLockNotificationPress(
  event: Event,
  deps: RecordingStoppedByAppLockNotificationPressDeps,
): void {
  if (event.type !== EventType.PRESS && event.type !== EventType.ACTION_PRESS) return;
  handleRecordingStoppedByAppLockNotificationData(event.detail.notification?.data, deps);
}

export function createRecordingStoppedByAppLockNotificationPressHandler(
  deps: RecordingStoppedByAppLockNotificationPressDeps,
): (event: Event) => void {
  return (event) => {
    handleRecordingStoppedByAppLockNotificationPress(event, deps);
  };
}
