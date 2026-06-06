jest.mock('@/entities/record', () => ({
  useRecordStore: {
    getState: jest.fn(() => ({
      records: [],
      updateAiStatus: jest.fn(),
    })),
  },
}));

jest.mock('../../lib/transcriptionCheckpoint', () => ({
  getTranscriptionCheckpoint: jest.fn().mockResolvedValue(null),
  saveTranscriptionCheckpoint: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/transcriptionPausedNotification', () => ({
  showTranscriptionPausedNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/whisperNativeLifecycle', () => ({
  isWhisperNativeWorkActive: jest.fn(() => false),
  waitForWhisperNativeIdleAfterAbort: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../pendingBackgroundTranscriptionRecord', () => ({
  markTranscriptionPausedForBackground: jest.fn(),
}));

jest.mock('../transcriptionResumePromptRequest', () => ({
  requestTranscriptionResumePrompt: jest.fn(),
}));

import { WHISPER_RESTART_RESET_TIMEOUT_MS } from '../../config/constants';
import {
  beginTranscriptionSession,
  clearTranscriptionCheckpointSnapshot,
  endTranscriptionSession,
  getTranscriptionCheckpointSnapshot,
  getTranscriptionRuntimeSnapshot,
  isNativeTranscriptionRunning,
  registerActiveTranscription,
  rememberTranscriptionCheckpointSnapshot,
  rememberTranscriptionStopInFlight,
  resetTranscriptionRuntimeForRestart,
  unregisterActiveTranscription,
} from '../transcriptionRuntimeRegistry';

describe('transcriptionRuntimeRegistry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    unregisterActiveTranscription('rec_runtime');
    endTranscriptionSession('rec_runtime');
    clearTranscriptionCheckpointSnapshot('rec_runtime');
  });

  it('reports native transcription as running for active sessions', () => {
    beginTranscriptionSession('rec_runtime');

    expect(isNativeTranscriptionRunning()).toBe(true);
  });

  it('waits for stop-in-flight during restart and records timeout pressure', async () => {
    const activeStop = jest.fn().mockResolvedValue(undefined);
    registerActiveTranscription('rec_runtime', activeStop);
    rememberTranscriptionStopInFlight('rec_runtime', new Promise<void>(() => {}));

    const reset = resetTranscriptionRuntimeForRestart('rec_runtime');
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(WHISPER_RESTART_RESET_TIMEOUT_MS);
    await reset;

    const snapshot = getTranscriptionRuntimeSnapshot();
    expect(snapshot.state).toBe('ready');
    expect(snapshot.recordId).toBe('rec_runtime');
    expect(snapshot.nativeBusyTimeouts).toBeGreaterThanOrEqual(1);
    expect(activeStop).toHaveBeenCalledTimes(1);
  });

  it('hydrates in-memory checkpoint snapshots with schema metadata', () => {
    rememberTranscriptionCheckpointSnapshot({
      recordId: 'rec_runtime',
      audioPath: '/docs/audio.wav',
      modelId: 'whisper-base',
      language: 'ru',
      totalChunks: 2,
      lastCompletedChunkIndex: 1,
      fullText: 'hello',
      segments: [],
    });

    const checkpoint = getTranscriptionCheckpointSnapshot('rec_runtime');
    expect(checkpoint).toMatchObject({
      schemaVersion: 1,
      recordId: 'rec_runtime',
      audioPath: '/docs/audio.wav',
      modelId: 'whisper-base',
      language: 'ru',
      totalChunks: 2,
      lastCompletedChunkIndex: 1,
      fullText: 'hello',
      segments: [],
    });
    expect(checkpoint?.updatedAt).toBeGreaterThan(0);
  });
});
