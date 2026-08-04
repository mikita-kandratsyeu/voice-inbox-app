import type { LocalAiModelId } from '@/entities/settings';
import { resolveLocalAiModelEntry } from '@/entities/settings/lib/resolveLocalAiModelEntry';
import { getDocumentDirectoryPath } from '@/shared/lib/fs';

export const getLocalLlmModelsDir = (): string => `${getDocumentDirectoryPath()}/local-llm-models`;

export const getLocalLlmModelPath = (id: LocalAiModelId): string => {
  const entry = resolveLocalAiModelEntry(id);

  if (!entry) {
    return `${getLocalLlmModelsDir()}/unknown.gguf`;
  }

  return `${getLocalLlmModelsDir()}/${entry.fileName}`;
};
