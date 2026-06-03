import type { UserFacingAIModel } from '../model/types';
import { formatModelContextTokens } from './formatModelContextTokens';

export type ModelMetaChip = {
  key: string;
  label: string;
  variant?: 'default' | 'accent';
};

export const AUTO_ROUTING_CONTEXT_TOKENS = 1_048_576;

/** Chip order: identity → behavior → specs → policy. */
export function buildAutoModelMetaChips(
  t: (key: string, options?: Record<string, unknown>) => string,
): ModelMetaChip[] {
  return [
    { key: 'routing', label: t('aiModels.autoRoutingChip') },
    {
      key: 'context',
      label: t('aiModels.contextChip', {
        size: formatModelContextTokens(AUTO_ROUTING_CONTEXT_TOKENS),
      }),
    },
  ];
}

export function buildCloudModelMetaChips(
  model: UserFacingAIModel,
  t: (key: string, options?: Record<string, unknown>) => string,
): ModelMetaChip[] {
  const chips: ModelMetaChip[] = [
    { key: 'provider', label: model.provider },
    {
      key: 'speed',
      label: t(`aiModels.speed.${model.speed}`, { defaultValue: model.speed }),
    },
    {
      key: 'context',
      label: t('aiModels.contextChip', { size: formatModelContextTokens(model.contextTokens) }),
    },
  ];
  if (model.usesOpenRouterZdr) {
    chips.push({ key: 'zdr', label: t('aiModels.zdrChip') });
  }
  return chips;
}
