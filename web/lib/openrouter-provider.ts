import { normalizeIncomingAiModel } from '@/config/constants';

/**
 * GPT-5.4 on OpenRouter: with `zdr: true` only Azure is eligible and returns 403 for many keys.
 * First-party OpenAI works; other models keep ZDR routing.
 */
export function openRouterProviderParamsForModel(model: string): Record<string, unknown> {
  const id = normalizeIncomingAiModel(model.trim());
  if (/^openai\/gpt-5\.4/i.test(id)) {
    return { only: ['OpenAI'] };
  }

  return { zdr: true };
}
