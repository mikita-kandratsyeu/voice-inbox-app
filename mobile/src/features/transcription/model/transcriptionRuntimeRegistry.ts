import { useRecordStore } from '@/entities/record';

import { schedulePausedNotificationIfResumable } from '../lib/paused-notification/schedulePausedNotificationIfResumable';
import { markTranscriptionPausedForBackground } from './pendingBackgroundTranscriptionRecord';
import { invalidateTranscriptionJob } from './transcriptionJobRegistry';

const backgroundCancelledRecordIds = new Set<string>();

/** Set when startTranscription begins; cleared in its `finally`. */
let sessionRecordId: string | null = null;
let activeRecordId: string | null = null;
let activeStop: (() => Promise<void>) | null = null;
let abortInFlight: Promise<void> | null = null;

export function isTranscriptionBackgroundCancelled(recordId: string): boolean {
  return backgroundCancelledRecordIds.has(recordId);
}

export function clearTranscriptionBackgroundCancelled(recordId: string): void {
  backgroundCancelledRecordIds.delete(recordId);
}

export function beginTranscriptionSession(recordId: string): void {
  sessionRecordId = recordId;
}

export function endTranscriptionSession(recordId: string): void {
  if (sessionRecordId === recordId) {
    sessionRecordId = null;
  }
}

export function isTranscriptionSessionActive(recordId?: string): boolean {
  if (recordId != null) {
    return sessionRecordId === recordId;
  }
  return sessionRecordId != null;
}

export function registerActiveTranscription(recordId: string, stop: () => Promise<void>): void {
  activeRecordId = recordId;
  activeStop = stop;
}

export function unregisterActiveTranscription(recordId: string): void {
  if (activeRecordId === recordId) {
    activeRecordId = null;
    activeStop = null;
  }
}

export function getActiveTranscriptionRecordId(): string | null {
  return activeRecordId ?? sessionRecordId;
}

/** True while a transcription session or native whisper_full may be active. */
export function isNativeTranscriptionRunning(): boolean {
  return sessionRecordId != null || activeRecordId != null || abortInFlight != null;
}

function pauseTranscriptionForBackground(recordId: string): void {
  backgroundCancelledRecordIds.add(recordId);
  markTranscriptionPausedForBackground(recordId);
  invalidateTranscriptionJob(recordId);
  useRecordStore.getState().updateAiStatus(recordId, 'idle');
  void schedulePausedNotificationIfResumable(recordId);
}

/** Stops native whisper when possible; always pauses UI. Never releases Metal context. */
export async function abortTranscriptionForAppBackground(): Promise<void> {
  if (abortInFlight) {
    return abortInFlight;
  }

  const recordId = activeRecordId ?? sessionRecordId;
  if (!recordId) {
    return;
  }

  const stop = activeStop;

  abortInFlight = (async () => {
    if (stop) {
      try {
        await stop();
      } catch {
        // Native cancel may reject while Metal tears down.
      }
    }
    pauseTranscriptionForBackground(recordId);
  })().finally(() => {
    activeRecordId = null;
    activeStop = null;
    abortInFlight = null;
  });

  return abortInFlight;
}
