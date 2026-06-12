import type { TranscriptSegment } from '../../model/types';
import { shouldUseTranscriptSegmentView } from '../transcriptDisplay';

const segment = (overrides: Partial<TranscriptSegment> = {}): TranscriptSegment => ({
  id: 'seg-1',
  startTime: '00:00',
  startMs: 0,
  endMs: 1000,
  text: 'Hello',
  ...overrides,
});

describe('shouldUseTranscriptSegmentView', () => {
  it('returns false without audio', () => {
    expect(shouldUseTranscriptSegmentView([segment()], false)).toBe(false);
  });

  it('returns true for multi-segment transcripts with audio', () => {
    expect(shouldUseTranscriptSegmentView([segment(), segment({ id: 'seg-2' })], true)).toBe(true);
  });

  it('returns true for a single segment with word tokens', () => {
    expect(
      shouldUseTranscriptSegmentView(
        [segment({ tokens: [{ text: 'Hello', startMs: 0, endMs: 500 }] })],
        true,
      ),
    ).toBe(true);
  });

  it('returns false for a flattened single segment without tokens', () => {
    expect(shouldUseTranscriptSegmentView([segment()], true)).toBe(false);
  });
});
