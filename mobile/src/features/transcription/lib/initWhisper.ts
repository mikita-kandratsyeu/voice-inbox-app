import { initWhisper, releaseAllWhisper, type WhisperContext } from 'whisper.rn';

import type { WhisperModelId, WhisperModelWeightsFormat } from '@/entities/settings';
import { IS_IOS } from '@/shared/lib';
import {
  getWhisperModelPath,
  isWhisperCoreMlSupportedForModel,
  resolveWhisperContextInitOptions,
} from '@/shared/lib/whisper';

import { WHISPER_IDLE_RELEASE_MS } from '../config/constants';
import { isNativeTranscriptionRunning } from '../model/transcriptionRuntimeRegistry';
import {
  beginWhisperNativeWork,
  endWhisperNativeWork,
  enqueueWhisperOperation,
  setWhisperNativeIdleListener,
  waitForWhisperNativeIdle,
} from './whisperNativeLifecycle';

type CachedContext = {
  context: WhisperContext;
  modelId: WhisperModelId;
  format: WhisperModelWeightsFormat;
};

let cachedContext: CachedContext | null = null;
let initPromise: Promise<WhisperContext> | null = null;
let idleTimeoutId: ReturnType<typeof setTimeout> | null = null;
let releaseInFlight: Promise<void> | null = null;
let releaseQueued = false;

const clearIdleTimer = (): void => {
  if (idleTimeoutId) {
    clearTimeout(idleTimeoutId);
    idleTimeoutId = null;
  }
};

const releaseWhisperContextNow = async (): Promise<void> => {
  clearIdleTimer();
  if (!cachedContext) return;

  await waitForWhisperNativeIdle();

  if (isNativeTranscriptionRunning()) {
    releaseQueued = true;
    return;
  }

  beginWhisperNativeWork();
  cachedContext = null;
  try {
    await releaseAllWhisper();
  } catch (e) {
    if (__DEV__) console.warn('[whisper] release failed:', e);
  } finally {
    endWhisperNativeWork();
  }
};

const drainQueuedRelease = (): void => {
  if (!releaseQueued || releaseInFlight) return;
  if (isNativeTranscriptionRunning()) return;

  releaseQueued = false;
  releaseInFlight = enqueueWhisperOperation(releaseWhisperContextNow).finally(() => {
    releaseInFlight = null;
    if (releaseQueued) {
      drainQueuedRelease();
    }
  });
};

export const scheduleIdleRelease = (): void => {
  clearIdleTimer();
  if (!cachedContext || isNativeTranscriptionRunning()) {
    return;
  }

  idleTimeoutId = setTimeout(() => {
    idleTimeoutId = null;
    releaseWhisperContext().catch(() => {});
  }, WHISPER_IDLE_RELEASE_MS);
};

const loadWhisperContext = async (
  modelId: WhisperModelId,
  format: WhisperModelWeightsFormat,
): Promise<WhisperContext> => {
  await waitForWhisperNativeIdle();

  if (cachedContext?.modelId === modelId && cachedContext.format === format) {
    return cachedContext.context;
  }

  if (cachedContext) {
    if (isNativeTranscriptionRunning()) {
      throw new Error('whisper_context_busy');
    }
    await waitForWhisperNativeIdle();
    beginWhisperNativeWork();
    cachedContext = null;
    try {
      await releaseAllWhisper();
    } catch (e) {
      if (__DEV__) console.warn('[whisper] release failed:', e);
    } finally {
      endWhisperNativeWork();
    }
  }

  beginWhisperNativeWork();
  try {
    const filePath = getWhisperModelPath(modelId, format);
    const whisperInitOptions = await resolveWhisperContextInitOptions(modelId);
    const coreMlActive = await isWhisperCoreMlSupportedForModel(modelId);
    const context = await initWhisper({
      filePath,
      ...whisperInitOptions,
    });
    if (__DEV__ && IS_IOS) {
      console.warn(
        `[whisper] context id=${context.id} gpu=${context.gpu} coreML=${whisperInitOptions.useCoreMLIos === true} encoder=${coreMlActive}`,
      );
    }
    cachedContext = { context, modelId, format };
    return context;
  } finally {
    endWhisperNativeWork();
  }
};

export const getWhisperContext = (
  modelId: WhisperModelId,
  format: WhisperModelWeightsFormat = 'q5_1',
): Promise<WhisperContext> =>
  enqueueWhisperOperation(async () => {
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

    initPromise = loadWhisperContext(modelId, format).finally(() => {
      initPromise = null;
    });

    const context = await initPromise;
    clearIdleTimer();
    return context;
  });

export const releaseWhisperContext = (): Promise<void> =>
  enqueueWhisperOperation(async () => {
    if (releaseInFlight) {
      releaseQueued = true;
      await releaseInFlight;
      return;
    }

    if (isNativeTranscriptionRunning()) {
      releaseQueued = true;
      return;
    }

    releaseInFlight = releaseWhisperContextNow().finally(() => {
      releaseInFlight = null;
      drainQueuedRelease();
    });

    await releaseInFlight;
  });

setWhisperNativeIdleListener(() => {
  drainQueuedRelease();
});
