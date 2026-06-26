jest.mock('@/shared/lib/platform', () => ({
  IS_IOS: true,
}));

jest.mock('../../config/transcriptionEngine', () => ({
  shouldUseIosWhisperKitEngine: jest.fn(),
}));

jest.mock('../nativeTranscription', () => ({
  isIosNativeTranscriptionAvailable: jest.fn(),
  prepareNativeTranscriptionModel: jest.fn(),
}));

jest.mock('@/shared/lib/whisper/whisperKitModelPath', () => ({
  getWhisperKitModelsDir: () => '/docs/argmax-models/whisperkit',
  mapWhisperModelIdToWhisperKitModel: (modelId: string) => modelId,
}));

import { shouldUseIosWhisperKitEngine } from '../../config/transcriptionEngine';
import {
  isSameCheckpointEngine,
  resolveCheckpointEngine,
  shouldSkipGgmlPreflightForIos,
} from '../transcriptionModelEngine';

const mockShouldUseIosWhisperKitEngine = jest.mocked(shouldUseIosWhisperKitEngine);

describe('transcriptionModelEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves whisper-rn when WhisperKit is disabled', () => {
    mockShouldUseIosWhisperKitEngine.mockReturnValue(false);
    expect(resolveCheckpointEngine()).toBe('whisper-rn');
    expect(shouldSkipGgmlPreflightForIos('whisper-base')).toBe(false);
  });

  it('resolves whisperkit-ios when WhisperKit is enabled', () => {
    mockShouldUseIosWhisperKitEngine.mockReturnValue(true);
    expect(resolveCheckpointEngine()).toBe('whisperkit-ios');
    expect(shouldSkipGgmlPreflightForIos('whisper-base')).toBe(true);
  });

  it('compares checkpoint engines with whisper-rn default', () => {
    expect(isSameCheckpointEngine(undefined, 'whisper-rn')).toBe(true);
    expect(isSameCheckpointEngine('whisper-rn', 'whisperkit-ios')).toBe(false);
    expect(isSameCheckpointEngine('whisperkit-ios', 'whisperkit-ios')).toBe(true);
  });
});
