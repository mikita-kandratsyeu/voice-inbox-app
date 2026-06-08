jest.mock('@/shared/lib/appLogger', () => ({
  diagWarn: jest.fn(),
}));

jest.mock('react-native', () => ({
  NativeModules: {
    AudioConverter: {
      convertToWav: jest.fn(),
      createWavChunk: jest.fn(),
    },
  },
  Platform: {
    OS: 'ios',
    Version: '17.0',
    select: (value: Record<string, unknown>) => value.ios,
  },
}));

import { NativeModules } from 'react-native';

import { convertToWav, createWavChunk } from '../convertToWav';

const mockConvertToWavNative = jest.mocked(NativeModules.AudioConverter.convertToWav);
const mockCreateWavChunkNative = jest.mocked(NativeModules.AudioConverter.createWavChunk);

describe('convertToWav native wrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConvertToWavNative.mockResolvedValue('/tmp/out.wav');
    mockCreateWavChunkNative.mockResolvedValue('/tmp/out.wav.chunk-0.wav');
  });

  it('normalizes iOS file paths for full WAV conversion', async () => {
    await expect(convertToWav('/tmp/in.m4a', '/tmp/out.wav')).resolves.toBe('/tmp/out.wav');

    expect(mockConvertToWavNative).toHaveBeenCalledWith(
      'file:///tmp/in.m4a',
      'file:///tmp/out.wav',
    );
  });

  it('normalizes iOS file paths for chunk WAV creation', async () => {
    await expect(
      createWavChunk('/tmp/in.wav', '/tmp/in.wav.chunk-1.wav', 15000, 20000),
    ).resolves.toBe('/tmp/out.wav.chunk-0.wav');

    expect(mockCreateWavChunkNative).toHaveBeenCalledWith(
      'file:///tmp/in.wav',
      'file:///tmp/in.wav.chunk-1.wav',
      15000,
      20000,
    );
  });

  it('returns null when native conversion rejects', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockCreateWavChunkNative.mockRejectedValueOnce(new Error('native failed'));

    await expect(createWavChunk('/tmp/in.wav', '/tmp/chunk.wav', 0, 1000)).resolves.toBeNull();
    warn.mockRestore();
  });
});
