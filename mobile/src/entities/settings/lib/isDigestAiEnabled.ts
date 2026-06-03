import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';

import type { AiExecutionMode, PrivateAiProvider } from '../model/types';
import { resolveEffectivePrivateAiProvider } from './resolveEffectivePrivateAiProvider';

/** Smart cloud digest, or Private with a configured OpenAI-compatible AI server (Pro). */
export function isDigestAiEnabled(
  aiExecutionMode: AiExecutionMode,
  privateAiProvider: PrivateAiProvider,
  isProActive: boolean = isProActiveFromStorageSync(),
): boolean {
  if (aiExecutionMode === 'smart_hybrid') return true;
  if (aiExecutionMode !== 'private_experimental') return false;
  return (
    resolveEffectivePrivateAiProvider(privateAiProvider, isProActive) === 'custom_openai'
  );
}
