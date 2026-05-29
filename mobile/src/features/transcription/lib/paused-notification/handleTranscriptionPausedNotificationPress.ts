import type { Event } from '@notifee/react-native';
import { EventType } from '@notifee/react-native';

import { isString } from '@/shared/lib/type-guards';

import { TRANSCRIPTION_PAUSED_NOTIFICATION_TYPE } from './constants';

export type TranscriptionPausedNotificationPressDeps = {
  onOpenPausedTranscription: (recordId: string) => void;
};

function extractTranscriptionPausedPressData(
  data: Record<string, string | number | object> | undefined,
): string | null {
  if (!data || data.type !== TRANSCRIPTION_PAUSED_NOTIFICATION_TYPE) return null;

  const recordId = isString(data.recordId) ? data.recordId.trim() : '';
  return recordId || null;
}

export function handleTranscriptionPausedNotificationData(
  data: Record<string, string | number | object> | undefined,
  deps: TranscriptionPausedNotificationPressDeps,
): void {
  const recordId = extractTranscriptionPausedPressData(data);
  if (!recordId) return;

  deps.onOpenPausedTranscription(recordId);
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
