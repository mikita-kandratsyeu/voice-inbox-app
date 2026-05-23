import { USER_FACING_AI_MODELS } from '../model/constants';
import type { UserSelectableAIModelId } from '../model/types';
import { RECOMMENDED_AI_MODEL_ID } from './recommendAiModel';

/** Cloud models gated behind Pro (`supportTierCode: premium_experimental`). */
export function isProOnlyAiModel(id: string): boolean {
  const entry = USER_FACING_AI_MODELS.find((m) => m.id === id);
  return entry?.supportTierCode === 'premium_experimental';
}

export const FALLBACK_AI_MODEL_WHEN_NOT_PRO =
  RECOMMENDED_AI_MODEL_ID satisfies UserSelectableAIModelId;
