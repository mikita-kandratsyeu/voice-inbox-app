import { NativeModules } from 'react-native';

import { IS_IOS } from '@/shared/lib';
import { i18n } from '@/shared/lib/i18n';
import { getWhisperLabel, getWhisperModelShortLabelKey } from '@/shared/lib/whisper';

const { DownloadActivityModule } = NativeModules;

let lastUpdateTime = 0;
const UPDATE_INTERVAL_MS = 1000;

export type WhisperDownloadLiveActivityVariant = 'ggml' | 'whisperkit';

const isAvailable = (): boolean => IS_IOS && Boolean(DownloadActivityModule);

const whisperKind = {
  activityKindPrefix: 'whisper',
  settingsDeeplinkPath: 'whisper',
} as const;

const localAiKind = {
  activityKindPrefix: 'llm',
  settingsDeeplinkPath: 'ai-models',
} as const;

const resolveWhisperDownloadLiveActivityText = (
  modelId: string,
  variant: WhisperDownloadLiveActivityVariant,
): { title: string; label: string } => {
  if (variant === 'whisperkit') {
    return {
      title: i18n.t(getWhisperModelShortLabelKey(modelId)),
      label: i18n.t('download.whisperKitLabel'),
    };
  }

  return {
    title: getWhisperLabel(modelId),
    label: i18n.t('download.whisperLabel'),
  };
};

export const startWhisperDownloadLiveActivity = async (
  modelId: string,
  variant: WhisperDownloadLiveActivityVariant = 'ggml',
): Promise<void> => {
  if (!isAvailable()) {
    return;
  }

  lastUpdateTime = 0;

  const { title, label } = resolveWhisperDownloadLiveActivityText(modelId, variant);
  const sessionId = `whisper-${modelId}-${Date.now()}`;

  return DownloadActivityModule.start(
    sessionId,
    modelId,
    title,
    label,
    whisperKind.activityKindPrefix,
    whisperKind.settingsDeeplinkPath,
  );
};

export const updateWhisperDownloadLiveActivity = async (
  progress: number,
  modelId: string,
  variant: WhisperDownloadLiveActivityVariant = 'ggml',
): Promise<void> => {
  if (!isAvailable()) {
    return;
  }

  const now = Date.now();
  if (now - lastUpdateTime < UPDATE_INTERVAL_MS) {
    return;
  }

  lastUpdateTime = now;

  const { title, label } = resolveWhisperDownloadLiveActivityText(modelId, variant);

  return DownloadActivityModule.update(progress, title, label);
};

export const startLocalAiDownloadLiveActivity = async (
  modelId: string,
  title: string,
): Promise<void> => {
  if (!isAvailable()) {
    return;
  }

  lastUpdateTime = 0;

  const label = i18n.t('download.whisperLabel');
  const sessionId = `llm-${modelId}-${Date.now()}`;

  return DownloadActivityModule.start(
    sessionId,
    modelId,
    title,
    label,
    localAiKind.activityKindPrefix,
    localAiKind.settingsDeeplinkPath,
  );
};

export const updateLocalAiDownloadLiveActivity = async (
  progress: number,
  title: string,
): Promise<void> => {
  if (!isAvailable()) {
    return;
  }

  const now = Date.now();
  if (now - lastUpdateTime < UPDATE_INTERVAL_MS) {
    return;
  }

  lastUpdateTime = now;

  const label = i18n.t('download.whisperLabel');

  return DownloadActivityModule.update(progress, title, label);
};

export const stopWhisperDownloadLiveActivity = async (): Promise<void> => {
  if (!isAvailable()) {
    return;
  }

  return DownloadActivityModule.stop();
};

/** Same native singleton as whisper; use when finishing a local LLM download activity. */
export const stopLocalAiDownloadLiveActivity = stopWhisperDownloadLiveActivity;
