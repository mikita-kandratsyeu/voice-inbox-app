import type { WhisperModelStatus } from '@/entities/settings';

export function isWhisperModelSelectable(variantStatus: WhisperModelStatus): boolean {
  if (variantStatus === 'downloading' || variantStatus === 'error') {
    return false;
  }
  return variantStatus === 'downloaded';
}
