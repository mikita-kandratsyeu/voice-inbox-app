export const FREE_MAX_RECORDING_MS = 10 * 60 * 1000;
export const PRO_MAX_RECORDING_MS = 60 * 60 * 1000;
export const PRIVATE_MAX_RECORDING_MS = 10 * 60 * 1000;
export const RECORDING_SOFT_WARNING_REMAINING_MS = 2 * 60 * 1000;
export const RECORDING_FINAL_WARNING_REMAINING_MS = 30 * 1000;

export type RecordingDurationExecutionMode = 'smart_hybrid' | 'private_experimental';
export type RecordingDurationPrivateProvider = 'local' | 'custom_openai';

export function getMaxRecordingMsForTier(
  isProActive: boolean,
  aiExecutionMode?: RecordingDurationExecutionMode,
  privateAiProvider?: RecordingDurationPrivateProvider,
): number {
  if (aiExecutionMode === 'private_experimental') {
    if (privateAiProvider === 'custom_openai') {
      return isProActive ? PRO_MAX_RECORDING_MS : PRIVATE_MAX_RECORDING_MS;
    }
    return PRIVATE_MAX_RECORDING_MS;
  }
  return isProActive ? PRO_MAX_RECORDING_MS : FREE_MAX_RECORDING_MS;
}
