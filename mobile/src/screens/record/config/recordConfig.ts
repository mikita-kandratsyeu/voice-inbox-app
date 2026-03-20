import { i18n } from '@/shared/lib';

export const MAX_RECORDING_MS = 20 * 60 * 1000;
export const WARNING_REMAINING_MS = 2 * 60 * 1000;
export const PAUSE_BTN_BG = 'rgba(255,255,255,0.18)';

export type RecordingState = 'idle' | 'recording' | 'paused';

export const getHeaderTitle = (state: RecordingState): string => {
  const key = `record.${state}` as 'record.idle' | 'record.recording' | 'record.paused';
  return i18n.t(key);
};
