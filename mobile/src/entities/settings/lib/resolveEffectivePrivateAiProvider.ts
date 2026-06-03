import type { PrivateAiProvider } from '../model/types';

/** Pro-gated: custom OpenAI-compatible server is only active while Pro is valid. */
export function resolveEffectivePrivateAiProvider(
  stored: PrivateAiProvider,
  isProActive: boolean,
): PrivateAiProvider {
  return stored === 'custom_openai' && isProActive ? 'custom_openai' : 'local';
}
