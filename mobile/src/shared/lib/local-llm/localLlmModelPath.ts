import type { LocalAiModelId } from '@/entities/settings';
import { getLocalAiModelEntry } from '@/entities/settings/model/constants';
import { getDocumentDirectoryPath } from '@/shared/lib/fs';

export const getLocalLlmModelsDir = (): string => `${getDocumentDirectoryPath()}/local-llm-models`;

export const getLocalLlmModelPath = (id: LocalAiModelId): string => {
  const entry = getLocalAiModelEntry(id);

  if (!entry) {
    return `${getLocalLlmModelsDir()}/unknown.gguf`;
  }

  return `${getLocalLlmModelsDir()}/${entry.fileName}`;
};
