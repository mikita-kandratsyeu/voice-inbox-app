import {
  buildTranslateChunkContext,
  isSuspiciouslyShortTranslation,
  normalizeTranslatedTranscript,
  resolveTranscriptTextForTranslation,
  splitTranscriptForChunkedTranslation,
  tailForTranslateContext,
} from './translate-chunking';

describe('translate-chunking', () => {
  it('tailForTranslateContext keeps tail within max chars', () => {
    expect(tailForTranslateContext('abcdef', 10)).toBe('abcdef');
    expect(tailForTranslateContext('abcdefghij', 4)).toBe('ghij');
  });

  it('buildTranslateChunkContext returns bounded prior tails', () => {
    const source = 'a'.repeat(500);
    const translation = 'b'.repeat(300);
    const ctx = buildTranslateChunkContext(source, translation);

    expect(ctx.priorSourceTail).toHaveLength(320);
    expect(ctx.priorTranslationTail).toHaveLength(180);
  });

  it('resolveTranscriptTextForTranslation prefers timed segments', () => {
    const text = resolveTranscriptTextForTranslation('flat transcript', [
      { startMs: 65_000, text: 'Hello team' },
    ]);

    expect(text).toMatch(/^\[1:05\] Hello team$/);
  });

  it('splitTranscriptForChunkedTranslation preserves paragraph separators metadata', () => {
    const { chunks, separators } = splitTranscriptForChunkedTranslation(
      'First paragraph.\n\nSecond paragraph.',
    );
    expect(chunks).toHaveLength(2);
    expect(separators[0]).toBe('\n\n');
    expect(separators[1]).toBe('');
  });

  it('normalizeTranslatedTranscript collapses extra blank lines', () => {
    expect(normalizeTranslatedTranscript('a\n\n\n\nb')).toBe('a\n\nb');
  });

  it('isSuspiciouslyShortTranslation flags implausibly short output', () => {
    const source = 'a'.repeat(200);
    expect(isSuspiciouslyShortTranslation(source, 'short')).toBe(true);
    expect(isSuspiciouslyShortTranslation(source, 'b'.repeat(80))).toBe(false);
  });
});
