import { useRecordStore } from '@/entities/record';

import {
  getTranscriptionCheckpoint,
  saveTranscriptionCheckpoint,
  type TranscriptionCheckpoint,
} from '../lib/transcriptionCheckpoint';
import { showTranscriptionPausedNotification } from '../lib/transcriptionPausedNotification';
import {
  isWhisperNativeWorkActive,
  waitForWhisperNativeIdleAfterAbort,
} from '../lib/whisperNativeLifecycle';
import { markTranscriptionPausedForBackground } from './pendingBackgroundTranscriptionRecord';
import { invalidateTranscriptionJob } from './transcriptionJobRegistry';
import { requestTranscriptionResumePrompt } from './transcriptionResumePromptRequest';

type CheckpointSnapshot = Omit<TranscriptionCheckpoint, 'schemaVersion' | 'updatedAt'>;

let lastCheckpointSnapshot: CheckpointSnapshot | null = null;

export function rememberTranscriptionCheckpointSnapshot(snapshot: CheckpointSnapshot): void {
  lastCheckpointSnapshot = snapshot;
}

export function clearTranscriptionCheckpointSnapshot(recordId: string): void {
  if (lastCheckpointSnapshot?.recordId === recordId) {
    lastCheckpointSnapshot = null;
  }
}

async function flushTranscriptionCheckpointForBackground(recordId: string): Promise<boolean> {
  const existing = await getTranscriptionCheckpoint(recordId);
  if (existing) return true;
  if (lastCheckpointSnapshot?.recordId !== recordId) return false;

  await saveTranscriptionCheckpoint(lastCheckpointSnapshot);
  return (await getTranscriptionCheckpoint(recordId)) != null;
}

/** Persists in-memory checkpoint after background stop (call from abort / useTranscription finally). */
export async function persistTranscriptionCheckpointForBackground(
  recordId: string,
): Promise<boolean> {
  return flushTranscriptionCheckpointForBackground(recordId);
}

const backgroundCancelledRecordIds = new Set<string>();

/** Set when startTranscription begins; cleared in its `finally`. */
let sessionRecordId: string | null = null;
let activeRecordId: string | null = null;
let activeStop: (() => Promise<void>) | null = null;
let abortInFlight: Promise<void> | null = null;
let abortRecordId: string | null = null;

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

export async function resetTranscriptionRuntimeForRestart(recordId: string): Promise<void> {
  if (abortInFlight && abortRecordId === recordId) {
    await abortInFlight.catch(() => {});
  }

  const shouldStopActive = activeRecordId === recordId;
  const stop = shouldStopActive ? activeStop : null;

  backgroundCancelledRecordIds.delete(recordId);
  invalidateTranscriptionJob(recordId);

  if (activeRecordId === recordId) {
    activeRecordId = null;
    activeStop = null;
  }
  if (sessionRecordId === recordId) {
    sessionRecordId = null;
  }

  if (stop) {
    try {
      await stop();
    } catch {
      // Native cancel can reject while whisper.rn is unwinding; restart continues from checkpoint.
    }
    await waitForWhisperNativeIdleAfterAbort();
  }
}

/** True while a transcription session or native whisper_full may be active. */
export function isNativeTranscriptionRunning(): boolean {
  return (
    sessionRecordId != null ||
    activeRecordId != null ||
    abortInFlight != null ||
    isWhisperNativeWorkActive()
  );
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
    // Before stop(): useTranscription catch checks backgroundCancelled to keep checkpoint.
    backgroundCancelledRecordIds.add(recordId);
    markTranscriptionPausedForBackground(recordId);
    useRecordStore.getState().updateAiStatus(recordId, 'paused');

    if (stop) {
      try {
        await stop();
      } catch {
        // Native cancel may reject while Metal tears down.
      }
    }

    const saved = await persistTranscriptionCheckpointForBackground(recordId);

    await waitForWhisperNativeIdleAfterAbort();

    invalidateTranscriptionJob(recordId);
    if (saved || (await getTranscriptionCheckpoint(recordId))) {
      useRecordStore.getState().updateAiStatus(recordId, 'resumable');
      const record = useRecordStore.getState().records.find((item) => item.id === recordId);
      void showTranscriptionPausedNotification({
        recordId,
        recordTitle: record?.title ?? '',
      }).catch(() => {});
      requestTranscriptionResumePrompt(recordId);
    } else {
      useRecordStore.getState().updateAiStatus(recordId, 'idle');
    }
  })().finally(() => {
    activeRecordId = null;
    activeStop = null;
    abortInFlight = null;
    abortRecordId = null;
  });
  abortRecordId = recordId;

  return abortInFlight;
}
