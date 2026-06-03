import {
  AI_MODEL_MINIMAX_M3,
  LEGACY_AI_MODEL_MINIMAX_M2_7,
  normalizeIncomingAiModel,
} from '@/config/constants';

/**
 * GPT-5.4 on OpenRouter: with `zdr: true` only Azure is eligible and returns 403 for many keys.
 * First-party OpenAI works; other models keep ZDR routing.
 *
 * Mobile catalog `usesOpenRouterZdr` should match this policy (DeepSeek direct API and GPT-5.4 excluded).
 */
export function openRouterProviderParamsForModel(model: string): Record<string, unknown> {
  const id = normalizeIncomingAiModel(model.trim());
  if (/^openai\/gpt-5\.4/i.test(id)) {
    return { only: ['OpenAI'] };
  }

  /** MiniMax M3 is not offered on ZDR endpoints on OpenRouter. */
  if (id === AI_MODEL_MINIMAX_M3) {
    return {};
  }

  if (id === LEGACY_AI_MODEL_MINIMAX_M2_7) {
    return { zdr: true };
  }

  if (/^deepseek\//i.test(id)) {
    return {};
  }

  return { zdr: true };
}
