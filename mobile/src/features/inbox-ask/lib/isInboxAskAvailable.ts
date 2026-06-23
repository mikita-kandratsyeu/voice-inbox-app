import {
  type AiExecutionMode,
  isPrivateCustomServerMode,
  type PrivateAiProvider,
} from '@/entities/settings';
import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';

/** Smart/cloud always; Private only with a configured AI server (Pro). */
export function isInboxAskAvailable(
  aiExecutionMode: AiExecutionMode,
  privateAiProvider: PrivateAiProvider,
  isProActive: boolean = isProActiveFromStorageSync(),
): boolean {
  if (aiExecutionMode !== 'private_experimental') {
    return true;
  }
  return isPrivateCustomServerMode(aiExecutionMode, privateAiProvider, isProActive);
}
