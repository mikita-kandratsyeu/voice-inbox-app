jest.mock('../../config/transcriptionEngine', () => ({
  shouldUseIosWhisperKitEngine: jest.fn(),
}));

jest.mock('../transcriptionModelEngine', () => ({
  isWhisperKitModelReady: jest.fn(),
}));

import { shouldUseIosWhisperKitEngine } from '../../config/transcriptionEngine';
import { canStartOfflineTranscription } from '../canStartOfflineTranscription';
import { isWhisperKitModelReady } from '../transcriptionModelEngine';

const mockShouldUseIosWhisperKitEngine = jest.mocked(shouldUseIosWhisperKitEngine);
const mockIsWhisperKitModelReady = jest.mocked(isWhisperKitModelReady);

describe('canStartOfflineTranscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires downloaded ggml on whisper.rn path', async () => {
    mockShouldUseIosWhisperKitEngine.mockReturnValue(false);
    await expect(canStartOfflineTranscription('whisper-small', 'not_downloaded')).resolves.toBe(
      false,
    );
    await expect(canStartOfflineTranscription('whisper-small', 'downloaded')).resolves.toBe(true);
  });

  it('requires WhisperKit model on disk when improved iOS engine is enabled', async () => {
    mockShouldUseIosWhisperKitEngine.mockReturnValue(true);
    mockIsWhisperKitModelReady.mockResolvedValue(false);
    await expect(canStartOfflineTranscription('whisper-small', 'not_downloaded')).resolves.toBe(
      false,
    );

    mockIsWhisperKitModelReady.mockResolvedValue(true);
    await expect(canStartOfflineTranscription('whisper-small', 'not_downloaded')).resolves.toBe(
      true,
    );
  });
});
