jest.mock('react-native', () => ({
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  })),
  NativeModules: {
    VoiceInboxTranscriptionModule: {
      isAvailable: jest.fn().mockResolvedValue(true),
      prepareModel: jest.fn().mockResolvedValue({ ready: true }),
      startTranscriptionJob: jest.fn().mockResolvedValue({ jobId: 'job-1' }),
      cancelTranscriptionJob: jest.fn().mockResolvedValue(undefined),
      cleanupTranscriptionJob: jest.fn().mockResolvedValue(undefined),
      invalidateEngineCaches: jest.fn().mockResolvedValue(undefined),
    },
  },
  Platform: { OS: 'ios' },
}));

import { NativeEventEmitter, NativeModules } from 'react-native';

import {
  isIosNativeTranscriptionAvailable,
  startNativeTranscriptionJob,
} from '../nativeTranscription';

describe('nativeTranscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports availability from native module', async () => {
    await expect(isIosNativeTranscriptionAvailable()).resolves.toBe(true);
    expect(NativeModules.VoiceInboxTranscriptionModule.isAvailable).toHaveBeenCalled();
  });

  it('starts a job and wires event listeners', () => {
    const onCompleted = jest.fn();
    const handle = startNativeTranscriptionJob(
      {
        jobId: 'job-1',
        audioPath: '/docs/audio.wav',
        durationMs: 10_000,
        language: 'en',
        whisperKitModel: 'base',
        modelCachePath: '/docs/argmax-models/whisperkit',
        diarization: false,
        chunkProfile: { chunkDurationSec: 45, chunkOverlapSec: 4 },
      },
      { onCompleted },
    );

    expect(NativeModules.VoiceInboxTranscriptionModule.startTranscriptionJob).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'job-1',
        audioPath: '/docs/audio.wav',
        whisperKitModel: 'base',
      }),
    );
    expect(NativeEventEmitter).toHaveBeenCalled();
    expect(handle.cancel).toEqual(expect.any(Function));
  });
});
