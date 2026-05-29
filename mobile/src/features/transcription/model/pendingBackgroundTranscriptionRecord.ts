/** Set when transcription stops because the app went to background. */
let pendingRecordId: string | null = null;

export function markTranscriptionPausedForBackground(recordId: string): void {
  pendingRecordId = recordId;
}

export function peekPendingBackgroundTranscriptionRecord(): string | null {
  return pendingRecordId;
}

export function clearPendingBackgroundTranscriptionRecord(): void {
  pendingRecordId = null;
}
