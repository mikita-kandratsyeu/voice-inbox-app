import type { RecordingStatus } from '@/entities/record';

export type Tab = 'transcript' | 'summary' | 'tasks';

export const TAB_LABELS: Record<Tab, string> = {
  transcript: 'Транскрипт',
  summary: 'Конспект',
  tasks: 'Задачи',
};

export const AI_STATUS_CONFIG: Record<
  RecordingStatus,
  { label: string; iconColor: string; bgColor: string }
> = {
  idle: { label: 'Ожидает обработки', iconColor: '#9ca3af', bgColor: '#f9fafb' },
  processing: { label: 'Транскрипция...', iconColor: '#f59e0b', bgColor: '#fffbeb' },
  done: { label: 'Транскрипт готов', iconColor: '#22c55e', bgColor: '#f0fdf4' },
  error: { label: 'Ошибка транскрипции', iconColor: '#ef4444', bgColor: '#fef2f2' },
};
