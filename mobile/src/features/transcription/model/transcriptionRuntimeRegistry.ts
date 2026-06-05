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
export type TranscriptionRuntimeState =
  | 'idle'
  | 'preparing'
  | 'transcribing'
  | 'stopping'
  | 'resetting'
  | 'ready';

type RuntimeSnapshot = {
  recordId: string | null;
  state: TranscriptionRuntimeState;
  updatedAt: number;
  nativeBusyTimeouts: number;
  consecutiveResetFailures: number;
};

const checkpointSnapshotsByRecordId = new Map<string, CheckpointSnapshot>();
const runtimeSnapshot: RuntimeSnapshot = {
  recordId: null,
  state: 'idle',
  updatedAt: Date.now(),
  nativeBusyTimeouts: 0,
  consecutiveResetFailures: 0,
};

export function setTranscriptionRuntimeState(
  state: TranscriptionRuntimeState,
  recordId: string | null = runtimeSnapshot.recordId,
): void {
  runtimeSnapshot.state = state;
  runtimeSnapshot.recordId = recordId;
  runtimeSnapshot.updatedAt = Date.now();
}

export function getTranscriptionRuntimeSnapshot(): RuntimeSnapshot {
  return { ...runtimeSnapshot };
}

export function rememberWhisperResetResult(success: boolean): void {
  if (success) {
    runtimeSnapshot.consecutiveResetFailures = 0;
    runtimeSnapshot.nativeBusyTimeouts = 0;
    return;
  }
  runtimeSnapshot.consecutiveResetFailures += 1;
  runtimeSnapshot.nativeBusyTimeouts += 1;
}

export function rememberTranscriptionCheckpointSnapshot(snapshot: CheckpointSnapshot): void {
  checkpointSnapshotsByRecordId.set(snapshot.recordId, snapshot);
}

export function clearTranscriptionCheckpointSnapshot(recordId: string): void {
  checkpointSnapshotsByRecordId.delete(recordId);
}

export function getTranscriptionCheckpointSnapshot(
  recordId: string,
): TranscriptionCheckpoint | null {
  const snapshot = checkpointSnapshotsByRecordId.get(recordId);
  if (!snapshot) return null;

  return {
    ...snapshot,
    schemaVersion: 1,
    updatedAt: Date.now(),
  };
}

async function flushTranscriptionCheckpointForBackground(recordId: string): Promise<boolean> {
  const existing = await getTranscriptionCheckpoint(recordId);
  if (existing) {
    return true;
  }

  const snapshot = checkpointSnapshotsByRecordId.get(recordId);
  if (!snapshot) {
    return false;
  }

  await saveTranscriptionCheckpoint(snapshot);
  return true;
}

/** Persists in-memory checkpoint after background stop (call from abort / useTranscription finally). */
export async function persistTranscriptionCheckpointForBackground(
  recordId: string,
): Promise<boolean> {
  try {
    return await flushTranscriptionCheckpointForBackground(recordId);
  } catch {
    return false;
  }
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
  setTranscriptionRuntimeState('preparing', recordId);
}

export function endTranscriptionSession(recordId: string): void {
  if (sessionRecordId === recordId) {
    sessionRecordId = null;
  }
  if (runtimeSnapshot.recordId === recordId) {
    setTranscriptionRuntimeState(activeRecordId === recordId ? 'ready' : 'idle', null);
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
  setTranscriptionRuntimeState('transcribing', recordId);
}

export function unregisterActiveTranscription(recordId: string): void {
  if (activeRecordId === recordId) {
    activeRecordId = null;
    activeStop = null;
  }
  if (runtimeSnapshot.recordId === recordId && runtimeSnapshot.state === 'transcribing') {
    setTranscriptionRuntimeState(sessionRecordId === recordId ? 'ready' : 'idle', null);
  }
}

export function getActiveTranscriptionRecordId(): string | null {
  return activeRecordId ?? sessionRecordId;
}

export async function resetTranscriptionRuntimeForRestart(recordId: string): Promise<void> {
  setTranscriptionRuntimeState('resetting', recordId);
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
    setTranscriptionRuntimeState('stopping', recordId);
    try {
      await stop();
    } catch {
      // Native cancel can reject while whisper.rn is unwinding; restart continues from checkpoint.
    }
    await waitForWhisperNativeIdleAfterAbort();
  }
  setTranscriptionRuntimeState('ready', recordId);
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
    setTranscriptionRuntimeState('stopping', recordId);
    markTranscriptionPausedForBackground(recordId);
    useRecordStore.getState().updateAiStatus(recordId, 'paused');

    const savedBeforeStop = await persistTranscriptionCheckpointForBackground(recordId);

    if (savedBeforeStop) {
      useRecordStore.getState().updateAiStatus(recordId, 'resumable');
      const record = useRecordStore.getState().records.find((item) => item.id === recordId);
      await showTranscriptionPausedNotification({
        recordId,
        recordTitle: record?.title ?? '',
        checkpointVerified: true,
      }).catch(() => {});
      requestTranscriptionResumePrompt(recordId);
    }

    if (stop) {
      try {
        await stop();
      } catch {
        // Native cancel may reject while Metal tears down.
      }
    }

    const saved = savedBeforeStop || (await persistTranscriptionCheckpointForBackground(recordId));

    await waitForWhisperNativeIdleAfterAbort();

    invalidateTranscriptionJob(recordId);
    if (!savedBeforeStop && (saved || (await getTranscriptionCheckpoint(recordId)))) {
      useRecordStore.getState().updateAiStatus(recordId, 'resumable');
      const record = useRecordStore.getState().records.find((item) => item.id === recordId);
      void showTranscriptionPausedNotification({
        recordId,
        recordTitle: record?.title ?? '',
        checkpointVerified: true,
      }).catch(() => {});
      requestTranscriptionResumePrompt(recordId);
    } else if (!saved) {
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
