import { initWhisper, releaseAllWhisper, type WhisperContext } from 'whisper.rn';

import type { WhisperModelId } from '@/entities/settings';
import { getWhisperModelPath } from '@/shared/lib/whisper';

type CachedContext = {
  context: WhisperContext;
  modelId: WhisperModelId;
};

let cachedContext: CachedContext | null = null;

export const getWhisperContext = async (modelId: WhisperModelId): Promise<WhisperContext> => {
  if (cachedContext?.modelId === modelId) {
    return cachedContext.context;
  }

  if (cachedContext) {
    await releaseAllWhisper();
    cachedContext = null;
  }

  const filePath = getWhisperModelPath(modelId);
  const context = await initWhisper({ filePath });

  cachedContext = { context, modelId };
  return context;
};

export const releaseWhisperContext = async (): Promise<void> => {
  if (cachedContext) {
    await releaseAllWhisper();
    cachedContext = null;
  }
};
