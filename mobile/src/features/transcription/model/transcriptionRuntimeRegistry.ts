import { useRecordStore } from '@/entities/record';

import { schedulePausedNotificationIfResumable } from '../lib/paused-notification/schedulePausedNotificationIfResumable';
import { markTranscriptionPausedForBackground } from './pendingBackgroundTranscriptionRecord';
import { invalidateTranscriptionJob } from './transcriptionJobRegistry';

const backgroundCancelledRecordIds = new Set<string>();

let activeRecordId: string | null = null;
let activeStop: (() => Promise<void>) | null = null;
let abortInFlight: Promise<void> | null = null;

export function isTranscriptionBackgroundCancelled(recordId: string): boolean {
  return backgroundCancelledRecordIds.has(recordId);
}

export function clearTranscriptionBackgroundCancelled(recordId: string): void {
  backgroundCancelledRecordIds.delete(recordId);
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
  return activeRecordId;
}

/** True while native whisper_full may still be using Metal (incl. during abort). */
export function isNativeTranscriptionRunning(): boolean {
  return activeRecordId != null || abortInFlight != null;
}

function pauseTranscriptionForBackground(recordId: string): void {
  backgroundCancelledRecordIds.add(recordId);
  markTranscriptionPausedForBackground(recordId);
  invalidateTranscriptionJob(recordId);
  useRecordStore.getState().updateAiStatus(recordId, 'idle');
  void schedulePausedNotificationIfResumable(recordId);
}

/** Stops native whisper work, then marks the record paused-for-resume. */
export async function abortTranscriptionForAppBackground(): Promise<void> {
  if (abortInFlight) {
    return abortInFlight;
  }

  const recordId = activeRecordId;
  const stop = activeStop;
  if (!recordId || !stop) {
    return;
  }

  abortInFlight = (async () => {
    try {
      await stop();
    } catch {
      // Native cancel may reject while Metal tears down.
    }
    pauseTranscriptionForBackground(recordId);
  })().finally(() => {
    activeRecordId = null;
    activeStop = null;
    abortInFlight = null;
  });

  return abortInFlight;
}
