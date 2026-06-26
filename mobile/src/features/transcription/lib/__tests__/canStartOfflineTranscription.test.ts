jest.mock('../../config/transcriptionEngine', () => ({
  shouldUseIosWhisperKitEngine: jest.fn(),
}));

jest.mock('../nativeTranscription', () => ({
  isIosNativeTranscriptionAvailable: jest.fn(),
}));

import { shouldUseIosWhisperKitEngine } from '../../config/transcriptionEngine';
import { canStartOfflineTranscription } from '../canStartOfflineTranscription';
import { isIosNativeTranscriptionAvailable } from '../nativeTranscription';

const mockShouldUseIosWhisperKitEngine = jest.mocked(shouldUseIosWhisperKitEngine);
const mockIsIosNativeTranscriptionAvailable = jest.mocked(isIosNativeTranscriptionAvailable);

describe('canStartOfflineTranscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires downloaded ggml on whisper.rn path', async () => {
    mockShouldUseIosWhisperKitEngine.mockReturnValue(false);
    await expect(canStartOfflineTranscription('not_downloaded')).resolves.toBe(false);
    await expect(canStartOfflineTranscription('downloaded')).resolves.toBe(true);
  });

  it('allows start on iOS WhisperKit when native module is available', async () => {
    mockShouldUseIosWhisperKitEngine.mockReturnValue(true);
    mockIsIosNativeTranscriptionAvailable.mockResolvedValue(true);
    await expect(canStartOfflineTranscription('not_downloaded')).resolves.toBe(true);
  });
});
