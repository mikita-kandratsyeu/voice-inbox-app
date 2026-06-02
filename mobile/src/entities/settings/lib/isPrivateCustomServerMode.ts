import type { AiExecutionMode, PrivateAiProvider } from '../model/types';

export function isPrivateCustomServerMode(
  aiExecutionMode: AiExecutionMode,
  privateAiProvider: PrivateAiProvider,
): boolean {
  return aiExecutionMode === 'private_experimental' && privateAiProvider === 'custom_openai';
}
