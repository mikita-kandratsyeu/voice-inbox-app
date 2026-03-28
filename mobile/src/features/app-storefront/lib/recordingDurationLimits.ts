export const FREE_MAX_RECORDING_MS = 10 * 60 * 1000;
export const PRO_MAX_RECORDING_MS = 30 * 60 * 1000;
export const PRIVATE_MAX_RECORDING_MS = 1 * 60 * 1000;
export const RECORDING_SOFT_WARNING_REMAINING_MS = 2 * 60 * 1000;
export const RECORDING_FINAL_WARNING_REMAINING_MS = 30 * 1000;

export type RecordingDurationExecutionMode = 'smart_hybrid' | 'private_experimental';

export function getMaxRecordingMsForTier(
  isProActive: boolean,
  aiExecutionMode?: RecordingDurationExecutionMode,
): number {
  if (aiExecutionMode === 'private_experimental') {
    return PRIVATE_MAX_RECORDING_MS;
  }
  return isProActive ? PRO_MAX_RECORDING_MS : FREE_MAX_RECORDING_MS;
}
