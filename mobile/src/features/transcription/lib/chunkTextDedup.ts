const normalizeForOverlap = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (value: string): string[] =>
  normalizeForOverlap(value)
    .split(' ')
    .filter((token) => token.length > 0);

/**
 * Removes a duplicated prefix from the next chunk when it repeats the tail of the previous chunk.
 */
export const dedupeChunkTextOverlap = (previousText: string, nextText: string): string => {
  const previousTokens = tokenize(previousText);
  const nextTokens = tokenize(nextText);
  if (previousTokens.length === 0 || nextTokens.length === 0) {
    return nextText.trim();
  }

  const maxOverlap = Math.min(previousTokens.length, nextTokens.length, 12);
  for (let overlap = maxOverlap; overlap >= 2; overlap -= 1) {
    const previousTail = previousTokens.slice(-overlap);
    const nextHead = nextTokens.slice(0, overlap);
    const matches = previousTail.every((token, index) => token === nextHead[index]);
    if (matches) {
      return nextTokens.slice(overlap).join(' ');
    }
  }

  return nextText.trim();
};
