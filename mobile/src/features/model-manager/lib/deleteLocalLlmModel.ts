import type { LocalAiModelId } from '@/entities/settings';
import { NitroFS } from '@/shared/lib/fs';
import { getLocalLlmModelPath } from '@/shared/lib/local-llm';

export const deleteLocalLlmModel = async (modelId: LocalAiModelId): Promise<void> => {
  const modelPath = getLocalLlmModelPath(modelId);

  if (await NitroFS.exists(modelPath)) {
    await NitroFS.unlink(modelPath);
  }
};
