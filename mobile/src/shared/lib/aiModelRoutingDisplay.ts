import type { TFunction } from 'i18next';

import { type AiModelRoutingMode, resolveAiModelDisplayLabel } from '@/entities/settings';

/** UI label for a cloud model: "Auto" when routed automatically, otherwise the concrete model. */
export function resolveAiModelRoutingDisplayLabel(
  t: TFunction,
  params: {
    modelMode?: AiModelRoutingMode;
    model?: string;
    modelLabel?: string;
  },
): string {
  if (params.modelMode === 'auto') {
    return t('aiModels.autoRecommendedLabel');
  }

  return resolveAiModelDisplayLabel(params.model, params.modelLabel);
}
