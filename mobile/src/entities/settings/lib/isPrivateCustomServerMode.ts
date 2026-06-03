import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';

import type { AiExecutionMode, PrivateAiProvider } from '../model/types';
import { resolveEffectivePrivateAiProvider } from './resolveEffectivePrivateAiProvider';

export function isPrivateCustomServerMode(
  aiExecutionMode: AiExecutionMode,
  privateAiProvider: PrivateAiProvider,
  isProActive: boolean = isProActiveFromStorageSync(),
): boolean {
  return (
    aiExecutionMode === 'private_experimental' &&
    resolveEffectivePrivateAiProvider(privateAiProvider, isProActive) === 'custom_openai'
  );
}
