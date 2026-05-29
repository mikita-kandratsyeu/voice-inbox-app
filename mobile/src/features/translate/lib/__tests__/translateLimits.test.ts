import {
  isTranscriptTooLongForTranslate,
  MAX_TRANSLATE_TRANSCRIPT_CHARS,
} from '../translateLimits';

describe('translateLimits', () => {
  it('allows transcripts at the limit', () => {
    const text = 'a'.repeat(MAX_TRANSLATE_TRANSCRIPT_CHARS);
    expect(isTranscriptTooLongForTranslate(text)).toBe(false);
  });

  it('blocks transcripts over the limit', () => {
    const text = 'a'.repeat(MAX_TRANSLATE_TRANSCRIPT_CHARS + 1);
    expect(isTranscriptTooLongForTranslate(text)).toBe(true);
  });

  it('ignores surrounding whitespace for length', () => {
    const text = `  ${'a'.repeat(MAX_TRANSLATE_TRANSCRIPT_CHARS)}  `;
    expect(isTranscriptTooLongForTranslate(text)).toBe(false);
  });
});
