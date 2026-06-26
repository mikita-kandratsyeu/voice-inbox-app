import { isWhisperModelSelectable } from '../isWhisperModelSelectable';

describe('isWhisperModelSelectable', () => {
  it('requires downloaded status', () => {
    expect(isWhisperModelSelectable('not_downloaded')).toBe(false);
    expect(isWhisperModelSelectable('downloaded')).toBe(true);
    expect(isWhisperModelSelectable('downloading')).toBe(false);
    expect(isWhisperModelSelectable('error')).toBe(false);
  });
});
