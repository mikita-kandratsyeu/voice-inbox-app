import { dedupeChunkTextOverlap } from '../chunkTextDedup';

describe('dedupeChunkTextOverlap', () => {
  it('removes duplicated prefix from the next chunk', () => {
    expect(dedupeChunkTextOverlap('hello world again', 'world again tomorrow')).toBe('tomorrow');
  });

  it('keeps text when there is no meaningful overlap', () => {
    expect(dedupeChunkTextOverlap('first chunk', 'second chunk')).toBe('second chunk');
  });

  it('requires at least two tokens of overlap before deduplicating', () => {
    expect(dedupeChunkTextOverlap('OpenAI, GPT', 'GPT model')).toBe('GPT model');
  });

  it('preserves original casing and punctuation in the suffix', () => {
    expect(dedupeChunkTextOverlap('hello world again', 'World again, Tomorrow!')).toBe(
      ', Tomorrow!',
    );
    expect(dedupeChunkTextOverlap('OpenAI, GPT model', 'GPT model rocks')).toBe('rocks');
  });
});
