import type { WhisperModelStatus } from '@/entities/settings';

/** WhisperKit models can be selected without a local ggml download. */
export function isWhisperModelSelectable(
  variantStatus: WhisperModelStatus,
  useIosWhisperKit: boolean,
): boolean {
  if (variantStatus === 'downloading' || variantStatus === 'error') {
    return false;
  }
  if (variantStatus === 'downloaded') {
    return true;
  }
  return useIosWhisperKit;
}
