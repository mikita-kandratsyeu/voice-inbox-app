import {
  type AiExecutionMode,
  isPrivateCustomServerMode,
  type PrivateAiProvider,
} from '@/entities/settings';

export function shouldApplyAutoTranscribeOnSave(
  persistedToggle: boolean,
  isProActive: boolean,
  aiExecutionMode?: AiExecutionMode,
): boolean {
  if (aiExecutionMode === 'private_experimental') {
    return persistedToggle;
  }
  return persistedToggle && isProActive;
}

export function shouldApplyPrivateServerAutoAi(
  persistedToggle: boolean,
  isProActive: boolean,
): boolean {
  return persistedToggle && isProActive;
}

export function shouldApplyAutoAiAfterTranscription(
  persistedToggle: boolean,
  isProActive: boolean,
  aiExecutionMode?: AiExecutionMode,
  privateAiProvider?: PrivateAiProvider,
): boolean {
  if (aiExecutionMode === 'private_experimental') {
    if (
      privateAiProvider != null &&
      isPrivateCustomServerMode(aiExecutionMode, privateAiProvider, isProActive)
    ) {
      return shouldApplyPrivateServerAutoAi(persistedToggle, isProActive);
    }
    return false;
  }
  return shouldApplyAutoTranscribeOnSave(persistedToggle, isProActive, aiExecutionMode);
}
