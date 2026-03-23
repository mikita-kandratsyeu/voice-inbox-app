import type { AIModelId } from '../model/types';

export const RECOMMENDED_AI_MODEL_ID =
  'google/gemini-3.1-flash-lite-preview' as const satisfies AIModelId;

export function getRecommendedAIModelId(): AIModelId {
  return RECOMMENDED_AI_MODEL_ID;
}
