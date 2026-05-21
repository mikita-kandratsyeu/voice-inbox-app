import type { TFunction } from 'i18next';

/** User-facing duration for a summary generation job (wall-clock, ≥1 s). */
export function formatSummaryGenerationDuration(ms: number, t: TFunction): string {
  const sec = Math.max(1, Math.round(ms / 1000));
  if (sec < 60) {
    return t('recordingDetail.summaryMetaDurationSeconds', { count: sec });
  }
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  if (seconds === 0) {
    return t('recordingDetail.summaryMetaDurationMinutesOnly', { count: minutes });
  }
  return t('recordingDetail.summaryMetaDurationMinutes', { minutes, seconds });
}
