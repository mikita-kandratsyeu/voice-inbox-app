import { i18n } from '@/shared/lib/i18n';

export function buildTranscriptionPausedNotificationCopy(recordTitle: string): {
  title: string;
  body: string;
} {
  const title = recordTitle.trim() || i18n.t('transcription.pausedNotificationUntitled');
  return {
    title: i18n.t('transcription.pausedNotificationTitle'),
    body: i18n.t('transcription.pausedNotificationBody', { title }),
  };
}
