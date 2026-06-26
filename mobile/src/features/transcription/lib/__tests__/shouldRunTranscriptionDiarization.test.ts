import { shouldRunTranscriptionDiarization } from '../nativeMeetingSpeakers';

jest.mock('../../config/transcriptionEngine', () => ({
  shouldUseIosWhisperKitEngine: jest.fn(() => true),
}));

describe('shouldRunTranscriptionDiarization', () => {
  it('runs for meeting records when Pro is active and WhisperKit is enabled', () => {
    expect(
      shouldRunTranscriptionDiarization({ classification: 'meeting' }, true),
    ).toBe(true);
  });

  it('skips non-meeting records', () => {
    expect(
      shouldRunTranscriptionDiarization({ classification: 'work' }, true),
    ).toBe(false);
    expect(shouldRunTranscriptionDiarization({}, true)).toBe(false);
  });

  it('never runs without Pro', () => {
    expect(
      shouldRunTranscriptionDiarization({ classification: 'meeting' }, false),
    ).toBe(false);
  });

  it('skips retranscribe when auto-refresh speakers is off', () => {
    expect(
      shouldRunTranscriptionDiarization(
        { classification: 'meeting' },
        true,
        { isRetranscribe: true, autoRefreshSpeakers: false },
      ),
    ).toBe(false);
  });

  it('runs retranscribe when auto-refresh speakers is on', () => {
    expect(
      shouldRunTranscriptionDiarization(
        { classification: 'meeting' },
        true,
        { isRetranscribe: true, autoRefreshSpeakers: true },
      ),
    ).toBe(true);
  });
});
