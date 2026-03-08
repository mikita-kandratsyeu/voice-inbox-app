export const ACCENT_BLUE = '#3d7ef6';
export const PAUSE_BTN_BG = 'rgba(255,255,255,0.18)';
export const DONE_BTN_BG = '#ffffff';

export type RecordingState = 'idle' | 'recording' | 'paused';

export const HEADER_TITLE: Record<RecordingState, string> = {
  idle: 'Готово к записи',
  recording: 'Запись...',
  paused: 'Пауза',
};
