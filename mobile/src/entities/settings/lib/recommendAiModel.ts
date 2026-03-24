import type { AIModelId } from '../model/types';

export const RECOMMENDED_AI_MODEL_ID = 'google/gemini-2.5-flash-lite' as const satisfies AIModelId;

export function getRecommendedAIModelId(): AIModelId {
  return RECOMMENDED_AI_MODEL_ID;
}
