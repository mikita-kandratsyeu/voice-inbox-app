import { initWhisper, releaseAllWhisper, type WhisperContext } from 'whisper.rn';

import type { WhisperModelId } from '@/entities/settings';
import { getWhisperModelPath } from '@/shared/lib/whisper';

import { WHISPER_IDLE_RELEASE_MS } from '../config/constants';

type CachedContext = {
  context: WhisperContext;
  modelId: WhisperModelId;
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

export const getWhisperContext = async (modelId: WhisperModelId): Promise<WhisperContext> => {
  if (cachedContext?.modelId === modelId) {
    clearIdleTimer();
    return cachedContext.context;
  }

  if (initPromise) {
    await initPromise;
    if (cachedContext?.modelId === modelId) {
      clearIdleTimer();
      return cachedContext.context;
    }
  }

  initPromise = (async () => {
    try {
      if (cachedContext?.modelId === modelId) return cachedContext.context;

      if (cachedContext) {
        const prev = cachedContext;
        cachedContext = null;
        try {
          await releaseAllWhisper();
        } catch (e) {
          if (__DEV__) console.warn('[whisper] release failed:', e);
        }
      }

      const filePath = getWhisperModelPath(modelId);
      const context = await initWhisper({ filePath });
      cachedContext = { context, modelId };
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
