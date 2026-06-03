import type { UserSelectableAIModelId } from './types';

/**
 * OpenRouter models where `supported_parameters` includes `reasoning`.
 * Verify: GET https://openrouter.ai/api/v1/models (filter by id).
 */
export const OPENROUTER_REASONING_CAPABLE_MODEL_IDS = new Set<UserSelectableAIModelId>([
  'google/gemini-2.5-flash-lite',
  'google/gemini-3.1-flash-lite',
  'deepseek/deepseek-v4-flash',
  'deepseek/deepseek-v4-pro',
  'xiaomi/mimo-v2.5-pro',
  'minimax/minimax-m2.7',
  'nvidia/nemotron-3-super-120b-a12b',
]);

export function userFacingModelSupportsOpenRouterReasoning(
  modelId: UserSelectableAIModelId,
): boolean {
  return OPENROUTER_REASONING_CAPABLE_MODEL_IDS.has(modelId);
}
