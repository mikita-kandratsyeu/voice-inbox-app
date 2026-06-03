import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';

import type { AiExecutionMode, PrivateAiProvider } from '../model/types';

/** Smart cloud digest, or Private with a configured OpenAI-compatible AI server (Pro). */
export function isDigestAiEnabled(
  aiExecutionMode: AiExecutionMode,
  privateAiProvider: PrivateAiProvider,
): boolean {
  if (aiExecutionMode === 'smart_hybrid') return true;
  if (aiExecutionMode !== 'private_experimental') return false;
  const effectiveProvider =
    isProActiveFromStorageSync() && privateAiProvider === 'custom_openai'
      ? 'custom_openai'
      : 'local';
  return effectiveProvider === 'custom_openai';
}
