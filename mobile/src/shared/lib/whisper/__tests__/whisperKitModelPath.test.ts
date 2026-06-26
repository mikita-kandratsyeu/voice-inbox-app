jest.mock('@/shared/lib/fs', () => ({
  getDocumentDirectoryPath: () => '/docs',
}));

import { getWhisperKitEstimatedDownloadMb } from '../whisperKitModelPath';

describe('getWhisperKitEstimatedDownloadMb', () => {
  it('includes full Core ML bundle sizes, not ggml weights only', () => {
    expect(getWhisperKitEstimatedDownloadMb('whisper-base')).toBe(145);
    expect(getWhisperKitEstimatedDownloadMb('whisper-small')).toBe(470);
    expect(getWhisperKitEstimatedDownloadMb('whisper-medium')).toBe(630);
  });
});
