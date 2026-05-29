type Listener = () => void;

let pendingRecordId: string | null = null;
const listeners = new Set<Listener>();

/** Prioritize resume prompt for this record (e.g. after tapping the paused notification). */
export function requestTranscriptionResumePrompt(recordId: string): void {
  pendingRecordId = recordId;
  for (const listener of listeners) {
    listener();
  }
}

export function peekPendingTranscriptionResumeRecordId(): string | null {
  return pendingRecordId;
}

export function clearPendingTranscriptionResumePrompt(): void {
  pendingRecordId = null;
}

export function subscribeTranscriptionResumePromptRequest(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
