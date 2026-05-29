export const TRANSCRIPTION_PAUSED_NOTIFICATION_CHANNEL_ID = 'transcription-paused-v1';

export const TRANSCRIPTION_PAUSED_NOTIFICATION_TYPE = 'transcription_paused';

export const TRANSCRIPTION_PAUSED_NOTIFICATION_ID_PREFIX = 'transcription-paused:';

export function getTranscriptionPausedNotificationId(recordId: string): string {
  return `${TRANSCRIPTION_PAUSED_NOTIFICATION_ID_PREFIX}${recordId}`;
}

export function isTranscriptionPausedNotificationId(id: string | undefined): boolean {
  return id?.startsWith(TRANSCRIPTION_PAUSED_NOTIFICATION_ID_PREFIX) ?? false;
}
