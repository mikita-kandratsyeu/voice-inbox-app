import { NativeModules } from 'react-native';

import { IS_IOS } from '@/shared/lib';
import { i18n } from '@/shared/lib/i18n';
import { getWhisperLabel } from '@/shared/lib/whisper';

const { DownloadActivityModule } = NativeModules;

let lastUpdateTime = 0;
const UPDATE_INTERVAL_MS = 1000;

const isAvailable = (): boolean => IS_IOS && Boolean(DownloadActivityModule);

export const startWhisperDownloadLiveActivity = async (modelId: string): Promise<void> => {
  if (!isAvailable()) {
    return;
  }

  const title = getWhisperLabel(modelId) ?? 'Whisper model';
  const label = i18n.t('download.whisperLabel');
  const sessionId = `whisper-${modelId}-${Date.now()}`;

  return DownloadActivityModule.start(sessionId, modelId, title, label);
};

export const updateWhisperDownloadLiveActivity = async (
  progress: number,
  modelId: string,
): Promise<void> => {
  if (!isAvailable()) {
    return;
  }

  const now = Date.now();
  if (now - lastUpdateTime < UPDATE_INTERVAL_MS) {
    return;
  }

  lastUpdateTime = now;

  const title = getWhisperLabel(modelId) ?? 'Whisper model';
  const label = i18n.t('download.whisperLabel');

  return DownloadActivityModule.update(progress, title, label);
};

export const stopWhisperDownloadLiveActivity = async (): Promise<void> => {
  if (!isAvailable()) {
    return;
  }

  return DownloadActivityModule.stop();
};
