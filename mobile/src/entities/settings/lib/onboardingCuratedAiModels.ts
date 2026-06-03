import { USER_FACING_AI_MODELS_BY_SPEED } from '../model/constants';
import type { UserFacingAIModel, UserSelectableAIModelId } from '../model/types';
import { isProOnlyAiModel } from './proOnlyAiModels';

/** Manual cloud models highlighted on onboarding (plus Auto). */
export const ONBOARDING_CURATED_CLOUD_MODEL_IDS: readonly UserSelectableAIModelId[] = [
  'google/gemini-3.1-flash-lite',
  'deepseek/deepseek-v4-flash',
];

const CURATED_ID_SET = new Set<string>(ONBOARDING_CURATED_CLOUD_MODEL_IDS);

export function getOnboardingCuratedCloudModels(isProActive: boolean): UserFacingAIModel[] {
  return USER_FACING_AI_MODELS_BY_SPEED.filter(
    (model) => (isProActive || !isProOnlyAiModel(model.id)) && CURATED_ID_SET.has(model.id),
  );
}

export function shouldShowOnboardingAllModelsHint(isProActive: boolean): boolean {
  const availableCount = USER_FACING_AI_MODELS_BY_SPEED.filter(
    (model) => isProActive || !isProOnlyAiModel(model.id),
  ).length;
  return availableCount > ONBOARDING_CURATED_CLOUD_MODEL_IDS.length;
}
