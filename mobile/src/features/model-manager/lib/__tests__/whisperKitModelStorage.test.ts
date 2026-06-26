jest.mock('@/shared/lib/platform', () => ({
  IS_IOS: true,
}));

jest.mock('@/shared/lib/whisper/whisperKitModelPath', () => ({
  getWhisperKitModelsDir: () => '/docs/argmax-models/whisperkit',
  getSpeakerKitModelsDir: () => '/docs/argmax-models/speakerkit',
  mapWhisperModelIdToWhisperKitModel: (modelId: string) => modelId,
}));

jest.mock('@/features/transcription/lib/nativeTranscription', () => ({
  isWhisperKitModelDownloaded: jest.fn(),
  getNativeWhisperKitModelStorageBytes: jest.fn(),
  deleteNativeWhisperKitModel: jest.fn(),
  isSpeakerKitModelDownloaded: jest.fn(),
  getNativeSpeakerKitStorageBytes: jest.fn(),
  deleteNativeSpeakerKitModel: jest.fn(),
}));

import {
  deleteWhisperKitModel,
  getWhisperKitModelStorageBytes,
  isWhisperKitModelOnDisk,
  listDownloadedWhisperKitModels,
} from '../whisperKitModelStorage';
import {
  deleteNativeWhisperKitModel,
  getNativeWhisperKitModelStorageBytes,
  isWhisperKitModelDownloaded,
} from '@/features/transcription/lib/nativeTranscription';

const mockIsWhisperKitModelDownloaded = jest.mocked(isWhisperKitModelDownloaded);
const mockGetNativeWhisperKitModelStorageBytes = jest.mocked(getNativeWhisperKitModelStorageBytes);
const mockDeleteNativeWhisperKitModel = jest.mocked(deleteNativeWhisperKitModel);

describe('whisperKitModelStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports whisperkit model on disk from native module', async () => {
    mockIsWhisperKitModelDownloaded.mockResolvedValue(true);
    await expect(isWhisperKitModelOnDisk('whisper-small')).resolves.toBe(true);
  });

  it('lists downloaded whisperkit models with byte sizes', async () => {
    mockGetNativeWhisperKitModelStorageBytes.mockImplementation(async (modelName: string) => {
      if (modelName.includes('small')) return 182_000_000;
      return 0;
    });

    await expect(listDownloadedWhisperKitModels()).resolves.toEqual([
      { id: 'whisper-small', bytes: 182_000_000 },
    ]);
  });

  it('deletes whisperkit model through native bridge', async () => {
    await deleteWhisperKitModel('whisper-base');
    expect(mockDeleteNativeWhisperKitModel).toHaveBeenCalled();
  });

  it('returns zero storage bytes when native module is unavailable', async () => {
    mockGetNativeWhisperKitModelStorageBytes.mockResolvedValue(0);
    await expect(getWhisperKitModelStorageBytes('whisper-medium')).resolves.toBe(0);
  });
});
