import type { AiExecutionMode, PrivateAiProvider } from '../model/types';

/** Folders + AI organize: smart hybrid, or private mode with a custom OpenAI-compatible server. */
export function areFoldersEnabledInAiMode(
  aiExecutionMode: AiExecutionMode,
  privateAiProvider: PrivateAiProvider,
): boolean {
  if (aiExecutionMode !== 'private_experimental') return true;
  return privateAiProvider === 'custom_openai';
}
