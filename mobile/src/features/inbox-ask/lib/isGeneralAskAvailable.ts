import type { AiExecutionMode, PrivateAiProvider } from '@/entities/settings';

export function isGeneralAskAvailable(
  aiExecutionMode: AiExecutionMode,
  privateAiProvider: PrivateAiProvider,
  isConnected: boolean | null,
): boolean {
  if (aiExecutionMode === 'smart_hybrid') {
    return isConnected !== false;
  }
  if (aiExecutionMode === 'private_experimental' && privateAiProvider === 'custom_openai') {
    return true;
  }
  return false;
}
