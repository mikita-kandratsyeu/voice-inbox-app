type WordSpan = {
  text: string;
  normalized: string;
  end: number;
};

const normalizeToken = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');

const extractWordSpans = (value: string): WordSpan[] => {
  const spans: WordSpan[] = [];
  const regex = /[\p{L}\p{N}]+(?:[''][\p{L}\p{N}]+)*/gu;
  let match: RegExpExecArray | null = regex.exec(value);
  while (match) {
    spans.push({
      text: match[0],
      normalized: normalizeToken(match[0]),
      end: match.index + match[0].length,
    });
    match = regex.exec(value);
  }
  return spans;
};

const tokenizeNormalized = (spans: WordSpan[]): string[] =>
  spans.map((span) => span.normalized).filter((token) => token.length > 0);

/**
 * Removes a duplicated prefix from the next chunk when it repeats the tail of the previous chunk.
 * Overlap is detected on normalized tokens; the returned suffix preserves original casing and punctuation.
 */
export const dedupeChunkTextOverlap = (previousText: string, nextText: string): string => {
  const trimmedNext = nextText.trim();
  if (trimmedNext.length === 0) return '';

  const previousSpans = extractWordSpans(previousText);
  const nextSpans = extractWordSpans(trimmedNext);
  const previousTokens = tokenizeNormalized(previousSpans);
  const nextTokens = tokenizeNormalized(nextSpans);

  if (previousTokens.length === 0 || nextTokens.length === 0) {
    return trimmedNext;
  }

  const maxOverlap = Math.min(previousTokens.length, nextTokens.length, 12);
  for (let overlap = maxOverlap; overlap >= 2; overlap -= 1) {
    const previousTail = previousTokens.slice(-overlap);
    const nextHead = nextTokens.slice(0, overlap);
    const matches = previousTail.every((token, index) => token === nextHead[index]);
    if (matches) {
      const lastOverlappedSpan = nextSpans[overlap - 1];
      if (!lastOverlappedSpan) {
        return trimmedNext;
      }
      return trimmedNext.slice(lastOverlappedSpan.end).trim();
    }
  }

  return trimmedNext;
};
