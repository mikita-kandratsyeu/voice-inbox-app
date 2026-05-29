import { useRecordStore } from '@/entities/record';
import { agentDebugLog } from '@/shared/lib/agentDebugLog';

import {
  getTranscriptionCheckpoint,
  saveTranscriptionCheckpoint,
  type TranscriptionCheckpoint,
} from '../lib/transcriptionCheckpoint';
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

async function flushTranscriptionCheckpointForBackground(recordId: string): Promise<void> {
  const existing = await getTranscriptionCheckpoint(recordId);
  if (existing) return;
  if (lastCheckpointSnapshot?.recordId !== recordId) return;

  await saveTranscriptionCheckpoint(lastCheckpointSnapshot);
}

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
  // #region agent log
  agentDebugLog(
    'transcriptionRuntimeRegistry.ts',
    'abortTranscriptionForAppBackground',
    {
      recordId,
      hasActiveStop: activeStop != null,
      sessionRecordId,
      activeRecordId,
    },
    'H5',
  );
  // #endregion
  if (!recordId) {
    return;
  }

  const stop = activeStop;

  abortInFlight = (async () => {
    // Before stop(): useTranscription catch checks backgroundCancelled to keep checkpoint.
    backgroundCancelledRecordIds.add(recordId);
    markTranscriptionPausedForBackground(recordId);

    if (stop) {
      try {
        await stop();
      } catch {
        // Native cancel may reject while Metal tears down.
      }
    }

    await waitForWhisperNativeIdleAfterAbort();
    // #region agent log
    agentDebugLog(
      'transcriptionRuntimeRegistry.ts',
      'abortTranscription native idle after stop',
      { recordId, appState: 'post-abort-settle' },
      'H8',
    );
    // #endregion

    // Flush after stop: useTranscription `finally` clears the in-memory snapshot.
    await flushTranscriptionCheckpointForBackground(recordId);

    invalidateTranscriptionJob(recordId);
    useRecordStore.getState().updateAiStatus(recordId, 'idle');
    const checkpoint = await getTranscriptionCheckpoint(recordId);
    if (checkpoint) {
      requestTranscriptionResumePrompt(recordId);
    }
  })().finally(() => {
    activeRecordId = null;
    activeStop = null;
    abortInFlight = null;
  });

  return abortInFlight;
}
