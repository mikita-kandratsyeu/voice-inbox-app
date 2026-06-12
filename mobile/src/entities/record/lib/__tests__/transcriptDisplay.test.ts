import type { TranscriptSegment } from '../../model/types';
import {
  shouldOpenSegmentTranscriptEditor,
  shouldUseTranscriptSegmentView,
} from '../transcriptDisplay';

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

describe('shouldOpenSegmentTranscriptEditor', () => {
  const textNoteInput = {
    transcript: 'Plain note',
    hasAudio: false,
  };

  it('opens segment editor for timed multi-segment voice transcripts', () => {
    expect(
      shouldOpenSegmentTranscriptEditor([segment(), segment({ id: 'seg-2' })], {
        transcript: 'Hello world',
        hasAudio: true,
      }),
    ).toBe(true);
  });

  it('opens markdown editor for a single plain text note', () => {
    expect(
      shouldOpenSegmentTranscriptEditor(
        [
          {
            id: 'note-text',
            startTime: '00:00',
            startMs: 0,
            endMs: 0,
            text: 'Plain note',
          },
        ],
        textNoteInput,
      ),
    ).toBe(false);
  });

  it('opens segment editor for a text note with multiple fragments', () => {
    expect(
      shouldOpenSegmentTranscriptEditor(
        [
          {
            id: 'note-text',
            startTime: '00:00',
            startMs: 0,
            endMs: 0,
            text: 'First paragraph.\n\nSecond paragraph.',
          },
        ],
        {
          transcript: 'First paragraph.\n\nSecond paragraph.',
          hasAudio: false,
        },
      ),
    ).toBe(true);
  });

  it('opens markdown editor for a flattened single voice transcript', () => {
    expect(
      shouldOpenSegmentTranscriptEditor([segment()], {
        transcript: 'Hello',
        hasAudio: true,
      }),
    ).toBe(false);
  });
});
