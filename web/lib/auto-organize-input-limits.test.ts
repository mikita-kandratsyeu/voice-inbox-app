import { smartTranscriptExcerpt } from './auto-organize-input-limits';

describe('smartTranscriptExcerpt', () => {
  it('returns short text unchanged', () => {
    expect(smartTranscriptExcerpt('hello world', 100)).toBe('hello world');
  });

  it('keeps head and tail with ellipsis gap', () => {
    const text = 'abcdefghijklmnopqrstuvwxyz';
    expect(smartTranscriptExcerpt(text, 16)).toBe('abcdefg\n…\nuvwxyz');
  });

  it('falls back to hard slice for tiny budgets', () => {
    expect(smartTranscriptExcerpt('abcdef', 4)).toBe('abcd');
  });
});
