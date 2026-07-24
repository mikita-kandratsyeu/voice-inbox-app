import { i18n } from '@/shared/lib';
import { ON_MEDIA_CHROME_FILL } from '@/shared/ui';

export const PAUSE_BTN_BG = ON_MEDIA_CHROME_FILL;

export type RecordingState = 'idle' | 'recording' | 'paused';

export const getHeaderTitle = (state: RecordingState): string => {
  const key = `record.${state}` as 'record.idle' | 'record.recording' | 'record.paused';
  return i18n.t(key);
};
