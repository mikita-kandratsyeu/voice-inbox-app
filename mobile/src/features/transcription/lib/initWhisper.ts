import { initWhisper, releaseAllWhisper, type WhisperContext } from 'whisper.rn';

import type { WhisperModelId, WhisperModelWeightsFormat } from '@/entities/settings';
import { IS_IOS } from '@/shared/lib';
import { getWhisperModelPath } from '@/shared/lib/whisper';

import { WHISPER_IDLE_RELEASE_MS } from '../config/constants';

type CachedContext = {
  context: WhisperContext;
  modelId: WhisperModelId;
  format: WhisperModelWeightsFormat;
};

let cachedContext: CachedContext | null = null;
let initPromise: Promise<WhisperContext> | null = null;
let idleTimeoutId: ReturnType<typeof setTimeout> | null = null;

const clearIdleTimer = (): void => {
  if (idleTimeoutId) {
    clearTimeout(idleTimeoutId);
    idleTimeoutId = null;
  }
};

export const scheduleIdleRelease = (): void => {
  clearIdleTimer();
  if (!cachedContext) return;

  idleTimeoutId = setTimeout(() => {
    idleTimeoutId = null;
    releaseWhisperContext().catch(() => {});
  }, WHISPER_IDLE_RELEASE_MS);
};

export const getWhisperContext = async (
  modelId: WhisperModelId,
  format: WhisperModelWeightsFormat = 'q5_1',
): Promise<WhisperContext> => {
  if (cachedContext?.modelId === modelId && cachedContext.format === format) {
    clearIdleTimer();
    return cachedContext.context;
  }

  if (initPromise) {
    await initPromise;
    if (cachedContext?.modelId === modelId && cachedContext.format === format) {
      clearIdleTimer();
      return cachedContext.context;
    }
  }

  initPromise = (async () => {
    try {
      if (cachedContext?.modelId === modelId && cachedContext.format === format) {
        return cachedContext.context;
      }

      if (cachedContext) {
        cachedContext = null;
        try {
          await releaseAllWhisper();
        } catch (e) {
          if (__DEV__) console.warn('[whisper] release failed:', e);
        }
      }

      const filePath = getWhisperModelPath(modelId, format);
      const context = await initWhisper({
        filePath,
        ...(IS_IOS ? { useCoreMLIos: true } : {}),
      });
      cachedContext = { context, modelId, format };
      return context;
    } finally {
      initPromise = null;
    }
  })();

  const context = await initPromise;
  clearIdleTimer();
  return context;
};

export const releaseWhisperContext = async (): Promise<void> => {
  clearIdleTimer();
  if (cachedContext) {
    cachedContext = null;
    try {
      await releaseAllWhisper();
    } catch (e) {
      if (__DEV__) console.warn('[whisper] release failed:', e);
    }
  }
};
