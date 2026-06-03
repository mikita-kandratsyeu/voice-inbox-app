import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';

import type { AiExecutionMode, PrivateAiProvider } from '../model/types';
import { resolveEffectivePrivateAiProvider } from './resolveEffectivePrivateAiProvider';

/** Folders + AI organize: smart hybrid, or private mode with a custom OpenAI-compatible server (Pro). */
export function areFoldersEnabledInAiMode(
  aiExecutionMode: AiExecutionMode,
  privateAiProvider: PrivateAiProvider,
  isProActive: boolean = isProActiveFromStorageSync(),
): boolean {
  if (aiExecutionMode !== 'private_experimental') return true;
  return resolveEffectivePrivateAiProvider(privateAiProvider, isProActive) === 'custom_openai';
}
