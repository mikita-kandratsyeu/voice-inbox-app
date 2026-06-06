jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
  },
}));

jest.mock('@/shared/lib/audio', () => {
  const actual = jest.requireActual('@/shared/lib/audio/splitAudioIntoChunks');
  return {
    splitAudioIntoChunks: actual.splitAudioIntoChunks,
    createWavChunk: jest.fn(),
  };
});

jest.mock('@/shared/lib/fs', () => ({
  NitroFS: {
    unlink: jest.fn(),
  },
}));

jest.mock('../whisperAppState', () => ({
  canRunWhisperGpuWork: jest.fn(),
}));

jest.mock('../whisperNativeLifecycle', () => ({
  beginWhisperNativeWork: jest.fn(),
  endWhisperNativeWork: jest.fn(),
}));

import { AppState } from 'react-native';
import type { WhisperContext } from 'whisper.rn';

import { createWavChunk } from '@/shared/lib/audio';
import { NitroFS } from '@/shared/lib/fs';

import { transcribeAudio } from '../transcribeAudio';
import { canRunWhisperGpuWork } from '../whisperAppState';

const mockAddAppStateListener = jest.mocked(AppState.addEventListener);
const mockCreateWavChunk = jest.mocked(createWavChunk);
const mockUnlink = jest.mocked(NitroFS.unlink);
const mockCanRunWhisperGpuWork = jest.mocked(canRunWhisperGpuWork);
let mockAppStateRemove: jest.Mock;

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function runTimersUntilSettled<T>(promise: Promise<T>): Promise<T> {
  let settled = false;
  void promise.finally(() => {
    settled = true;
  });

  for (let i = 0; i < 30 && !settled; i++) {
    await Promise.resolve();
    await jest.runOnlyPendingTimersAsync();
  }

  return promise;
}

describe('transcribeAudio', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockAppStateRemove = jest.fn();
    mockAddAppStateListener.mockReturnValue({ remove: mockAppStateRemove } as never);
    mockCanRunWhisperGpuWork.mockReturnValue(true);
    mockCreateWavChunk.mockImplementation((_input: string, output: string) =>
      Promise.resolve(output),
    );
    mockUnlink.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('transcribes short audio without chunking and maps segment timestamps/tokens', async () => {
    const stop = jest.fn().mockResolvedValue(undefined);
    const transcribe = jest.fn().mockReturnValue({
      stop,
      promise: Promise.resolve({
        result: ' hello ',
        segments: [
          {
            text: ' hello ',
            t0: 10,
            t1: 30,
            tokens: [
              { text: 'hello', t0: 11, t1: 20 },
              { text: '[noise]', t0: 21, t1: 22 },
            ],
          },
        ],
      }),
    });
    const context = { transcribe } as unknown as WhisperContext;

    const result = await transcribeAudio({
      context,
      audioPath: '/tmp/audio.wav',
      durationMs: 10_000,
      language: 'en',
    }).promise;

    expect(transcribe).toHaveBeenCalledWith('/tmp/audio.wav', { language: 'en' });
    expect(mockCreateWavChunk).not.toHaveBeenCalled();
    expect(result).toEqual({
      fullText: 'hello',
      segments: [
        {
          id: '0',
          startTime: '00:00',
          startMs: 100,
          endMs: 300,
          text: 'hello',
          tokens: [{ text: 'hello', startMs: 110, endMs: 200 }],
        },
      ],
    });
    expect(mockAppStateRemove).toHaveBeenCalled();
  });

  it('creates one temporary WAV per long chunk, transcribes chunk files, offsets timestamps, and cleans up', async () => {
    const onProgress = jest.fn();
    const onChunkCompleted = jest.fn();
    const transcribe = jest.fn((path: string, options: { prompt?: string }) => ({
      stop: jest.fn().mockResolvedValue(undefined),
      promise: Promise.resolve({
        result: `text:${path.split('.chunk-')[1]}`,
        segments: [{ text: `seg:${path}`, t0: 10, t1: 20 }],
      }),
    }));
    const context = { transcribe } as unknown as WhisperContext;

    const result = await runTimersUntilSettled(
      transcribeAudio({
        context,
        audioPath: '/tmp/audio.wav',
        durationMs: 50_000,
        language: 'ru',
        chunkProfile: { chunkDurationSec: 20, chunkOverlapSec: 5 },
        onProgress,
        onChunkCompleted,
      }).promise,
    );

    expect(mockCreateWavChunk).toHaveBeenCalledTimes(4);
    expect(mockCreateWavChunk.mock.calls.map((call) => call.slice(0, 4))).toEqual([
      ['/tmp/audio.wav', '/tmp/audio.wav.chunk-0.wav', 0, 20000],
      ['/tmp/audio.wav', '/tmp/audio.wav.chunk-1.wav', 15000, 20000],
      ['/tmp/audio.wav', '/tmp/audio.wav.chunk-2.wav', 30000, 20000],
      ['/tmp/audio.wav', '/tmp/audio.wav.chunk-3.wav', 45000, 5000],
    ]);
    expect(transcribe.mock.calls.map((call) => call[0])).toEqual([
      '/tmp/audio.wav.chunk-0.wav',
      '/tmp/audio.wav.chunk-1.wav',
      '/tmp/audio.wav.chunk-2.wav',
      '/tmp/audio.wav.chunk-3.wav',
    ]);
    expect(transcribe.mock.calls.every(([, options]) => !('offset' in options))).toBe(true);
    expect(transcribe.mock.calls.every(([, options]) => !('duration' in options))).toBe(true);
    expect(mockUnlink.mock.calls.map((call) => call[0])).toEqual([
      '/tmp/audio.wav.chunk-0.wav',
      '/tmp/audio.wav.chunk-1.wav',
      '/tmp/audio.wav.chunk-2.wav',
      '/tmp/audio.wav.chunk-3.wav',
    ]);
    expect(result.segments.map((segment) => segment.startMs)).toEqual([100, 15100, 30100, 45100]);
    expect(onProgress.mock.calls).toEqual([
      [1, 4],
      [2, 4],
      [3, 4],
      [4, 4],
    ]);
    expect(onChunkCompleted).toHaveBeenCalledTimes(4);
  });

  it('resumes long transcription from checkpoint state', async () => {
    const transcribe = jest.fn((path: string) => ({
      stop: jest.fn().mockResolvedValue(undefined),
      promise: Promise.resolve({
        result: `chunk:${path}`,
        segments: [{ text: `seg:${path}`, t0: 0, t1: 10 }],
      }),
    }));
    const context = { transcribe } as unknown as WhisperContext;
    const existingSegment = { id: '0', startTime: '00:00', startMs: 0, endMs: 100, text: 'old' };
    const onProgress = jest.fn();

    const result = await runTimersUntilSettled(
      transcribeAudio({
        context,
        audioPath: '/tmp/audio.wav',
        durationMs: 50_000,
        chunkProfile: { chunkDurationSec: 20, chunkOverlapSec: 5 },
        resume: {
          startChunkIndex: 2,
          fullText: 'old text',
          segments: [existingSegment],
        },
        onProgress,
      }).promise,
    );

    expect(mockCreateWavChunk.mock.calls.map((call) => call[1])).toEqual([
      '/tmp/audio.wav.chunk-2.wav',
      '/tmp/audio.wav.chunk-3.wav',
    ]);
    expect(result.segments[0]).toBe(existingSegment);
    expect(result.segments.slice(1).map((segment) => segment.id)).toEqual(['1', '2']);
    expect(onProgress.mock.calls[0]).toEqual([2, 4]);
  });

  it('recycles Whisper context every twelve completed chunks during long transcription', async () => {
    const transcribe = jest.fn((path: string) => ({
      stop: jest.fn().mockResolvedValue(undefined),
      promise: Promise.resolve({
        result: path,
        segments: [],
      }),
    }));
    const context = { transcribe } as unknown as WhisperContext;
    const recycleContext = jest.fn().mockResolvedValue(context);

    await runTimersUntilSettled(
      transcribeAudio({
        context,
        recycleContext,
        audioPath: '/tmp/audio.wav',
        durationMs: 130_000,
        chunkProfile: { chunkDurationSec: 10, chunkOverlapSec: 0 },
      }).promise,
    );

    expect(transcribe).toHaveBeenCalledTimes(13);
    expect(recycleContext).toHaveBeenCalledTimes(1);
  });

  it('stops active native transcription and resolves as a native abort', async () => {
    const raw = deferred<{ result: string; segments: unknown[] }>();
    const stop = jest.fn().mockResolvedValue(undefined);
    const transcribe = jest.fn().mockReturnValue({ stop, promise: raw.promise });
    const context = { transcribe } as unknown as WhisperContext;
    const handle = transcribeAudio({
      context,
      audioPath: '/tmp/audio.wav',
      durationMs: 10_000,
    });

    await Promise.resolve();
    await Promise.resolve();
    await handle.stop();
    raw.resolve({ result: '', segments: [] });

    await expect(handle.promise).rejects.toMatchObject({ code: 'native_abort' });
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
