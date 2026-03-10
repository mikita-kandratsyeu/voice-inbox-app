export const MAX_RECORDING_MS = 30 * 60 * 1000;
export const WARNING_REMAINING_MS = 2 * 60 * 1000;
export const PAUSE_BTN_BG = 'rgba(255,255,255,0.18)';

export type RecordingState = 'idle' | 'recording' | 'paused';

export const HEADER_TITLE: Record<RecordingState, string> = {
  idle: 'Готово к записи',
  recording: 'Запись...',
  paused: 'Пауза',
};
