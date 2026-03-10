import type { RecordingStatus } from '@/entities/record';
import { i18n } from '@/shared/lib';

export type Tab = 'transcript' | 'summary' | 'tasks';

export const getTabLabel = (tab: Tab): string => i18n.t(`recordingDetail.${tab}`);

const AI_STATUS_COLORS: Record<RecordingStatus, { iconColor: string; bgColor: string }> = {
  idle: { iconColor: '#9ca3af', bgColor: '#f9fafb' },
  processing: { iconColor: '#f59e0b', bgColor: '#fffbeb' },
  done: { iconColor: '#22c55e', bgColor: '#f0fdf4' },
  error: { iconColor: '#ef4444', bgColor: '#fef2f2' },
};

export const getAiStatusConfig = (
  status: RecordingStatus,
): { label: string; iconColor: string; bgColor: string } => ({
  label: i18n.t(`aiStatus.${status}`),
  ...AI_STATUS_COLORS[status],
});
