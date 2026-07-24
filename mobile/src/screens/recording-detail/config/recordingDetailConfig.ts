import type { RecordingStatus } from '@/entities/record';
import { i18n } from '@/shared/lib';

export type Tab = 'transcript' | 'summary' | 'dialogue' | 'tasks';

export const getTabLabel = (tab: Tab, options?: { hasAudio?: boolean }): string => {
  if (tab === 'transcript' && options?.hasAudio === false) {
    return i18n.t('recordingDetail.text');
  }

  return i18n.t(`recordingDetail.${tab}`);
};

const AI_STATUS_COLORS: Record<RecordingStatus, { iconColor: string; bgColor: string }> = {
  idle: { iconColor: '#9ca3af', bgColor: '#f9fafb' },
  loading_model: { iconColor: '#f59e0b', bgColor: '#fffbeb' },
  processing: { iconColor: '#f59e0b', bgColor: '#fffbeb' },
  queued: { iconColor: '#f59e0b', bgColor: '#fffbeb' },
  paused: { iconColor: '#f59e0b', bgColor: '#fffbeb' },
  resumable: { iconColor: '#f59e0b', bgColor: '#fffbeb' },
  cancelling: { iconColor: '#f59e0b', bgColor: '#fffbeb' },
  done: { iconColor: '#22c55e', bgColor: '#f0fdf4' },
  error: { iconColor: '#ef4444', bgColor: '#fef2f2' },
};

export const getAiStatusConfig = (
  status: RecordingStatus,
): { label: string; iconColor: string; bgColor: string } => ({
  label: i18n.t(`aiStatus.${status}`),
  ...AI_STATUS_COLORS[status],
});
