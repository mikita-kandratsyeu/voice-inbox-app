jest.mock('@/shared/lib/fs', () => ({
  getDocumentDirectoryPath: () => '/docs',
}));

import {
  getWhisperKitEstimatedDownloadMb,
  mapWhisperModelIdToWhisperKitModel,
} from '../whisperKitModelPath';

describe('getWhisperKitEstimatedDownloadMb', () => {
  it('includes full Core ML bundle sizes, not ggml weights only', () => {
    expect(getWhisperKitEstimatedDownloadMb('whisper-base')).toBe(145);
    expect(getWhisperKitEstimatedDownloadMb('whisper-small')).toBe(470);
    expect(getWhisperKitEstimatedDownloadMb('whisper-medium')).toBe(630);
    expect(getWhisperKitEstimatedDownloadMb('whisper-large-v3-turbo')).toBe(960);
  });

  it('maps large v3 turbo to the Argmax HuggingFace variant', () => {
    expect(mapWhisperModelIdToWhisperKitModel('whisper-large-v3-turbo')).toBe(
      'openai_whisper-large-v3-v20240930_turbo',
    );
  });
});
