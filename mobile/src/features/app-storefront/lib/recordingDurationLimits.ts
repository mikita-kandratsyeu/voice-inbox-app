export const FREE_MAX_RECORDING_MS = 10 * 60 * 1000;
export const PRO_MAX_RECORDING_MS = 30 * 60 * 1000;
export const RECORDING_SOFT_WARNING_REMAINING_MS = 2 * 60 * 1000;
export const RECORDING_FINAL_WARNING_REMAINING_MS = 30 * 1000;

export function getMaxRecordingMsForTier(isProActive: boolean): number {
  return isProActive ? PRO_MAX_RECORDING_MS : FREE_MAX_RECORDING_MS;
}
