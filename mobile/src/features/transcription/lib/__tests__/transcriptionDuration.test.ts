import { isTooShortForTranscription, MIN_TRANSCRIBE_MS } from '../transcriptionDuration';

describe('transcriptionDuration', () => {
  it('isTooShortForTranscription uses MIN_TRANSCRIBE_MS', () => {
    expect(isTooShortForTranscription(MIN_TRANSCRIBE_MS - 1)).toBe(true);
    expect(isTooShortForTranscription(MIN_TRANSCRIBE_MS)).toBe(false);
    expect(isTooShortForTranscription(undefined)).toBe(true);
  });
});
