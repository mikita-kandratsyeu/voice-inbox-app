import { shouldRunTranscriptionDiarization } from '../shouldRunTranscriptionDiarization';

describe('shouldRunTranscriptionDiarization', () => {
  it('runs for meeting records when Pro is active and the global toggle is off', () => {
    expect(
      shouldRunTranscriptionDiarization({ classification: 'meeting' }, false, true),
    ).toBe(true);
  });

  it('runs for all records when Pro is active and the global toggle is on', () => {
    expect(
      shouldRunTranscriptionDiarization({ classification: 'personal' }, true, true),
    ).toBe(true);
    expect(shouldRunTranscriptionDiarization({}, true, true)).toBe(true);
  });

  it('skips non-meeting records when the global toggle is off', () => {
    expect(
      shouldRunTranscriptionDiarization({ classification: 'work' }, false, true),
    ).toBe(false);
    expect(shouldRunTranscriptionDiarization({}, false, true)).toBe(false);
  });

  it('never runs without Pro, including meeting records', () => {
    expect(
      shouldRunTranscriptionDiarization({ classification: 'meeting' }, false, false),
    ).toBe(false);
    expect(
      shouldRunTranscriptionDiarization({ classification: 'meeting' }, true, false),
    ).toBe(false);
  });
});
