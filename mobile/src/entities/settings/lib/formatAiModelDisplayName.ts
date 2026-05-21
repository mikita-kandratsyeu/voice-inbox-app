import { LOCAL_AI_MODELS, USER_FACING_AI_MODELS } from '../model/constants';

/** Human-readable label for an OpenRouter or local LLM model id. */
export function formatAiModelDisplayName(modelId: string): string {
  const id = modelId.trim();
  if (!id) return id;

  const cloud = USER_FACING_AI_MODELS.find((m) => m.id === id);
  if (cloud) return cloud.name;

  const local = LOCAL_AI_MODELS.find((m) => m.id === id);
  if (local) return local.name;

  return id;
}
