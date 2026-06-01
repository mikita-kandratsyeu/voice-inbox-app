import { LOCAL_AI_MODELS, USER_FACING_AI_MODELS } from '../model/constants';

/** Auto-routed / server-only ids not listed in the manual model picker. */
const SERVER_RESOLVED_AI_MODEL_DISPLAY_NAMES: Record<string, string> = {
  'xiaomi/mimo-v2.5': 'MiMo V2.5',
};

/** Human-readable label for an OpenRouter or local LLM model id. */
export function formatAiModelDisplayName(modelId: string): string {
  const id = modelId.trim();
  if (!id) return id;

  const serverResolved = SERVER_RESOLVED_AI_MODEL_DISPLAY_NAMES[id];
  if (serverResolved) return serverResolved;

  const cloud = USER_FACING_AI_MODELS.find((m) => m.id === id);
  if (cloud) return cloud.name;

  const local = LOCAL_AI_MODELS.find((m) => m.id === id);
  if (local) return local.name;

  return id;
}
