import { isWhisperModelSelectable } from '../isWhisperModelSelectable';

describe('isWhisperModelSelectable', () => {
  it('requires a downloaded ggml model on whisper.rn path', () => {
    expect(isWhisperModelSelectable('not_downloaded', false)).toBe(false);
    expect(isWhisperModelSelectable('downloaded', false)).toBe(true);
  });

  it('allows selection on iOS WhisperKit without a local ggml file', () => {
    expect(isWhisperModelSelectable('not_downloaded', true)).toBe(true);
    expect(isWhisperModelSelectable('downloading', true)).toBe(false);
    expect(isWhisperModelSelectable('error', true)).toBe(false);
  });
});
