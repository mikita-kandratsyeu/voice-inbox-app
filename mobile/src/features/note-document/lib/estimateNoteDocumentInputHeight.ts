/** Keep in sync with `NOTE_DOCUMENT_BODY_LINE_HEIGHT` in `documentMarkdownTheme`. */
const NOTE_DOCUMENT_BODY_LINE_HEIGHT = 28;

/** Matches multiline `paddingVertical` in `getInputFieldInputStyle` (8 + 8). */
export const NOTE_DOCUMENT_INPUT_VERTICAL_PADDING = 16;
const CHARS_PER_LINE_PHONE = 42;
const CHARS_PER_LINE_TABLET = 91;

// Cache to avoid recalculating for same content
const heightCache = new Map<string, number>();
const MAX_CACHE_SIZE = 50;

/** Fallback height before/without a reliable `onContentSizeChange` measurement. */
export function estimateNoteDocumentInputHeight(
  text: string,
  minHeight: number,
  isTablet: boolean,
): number {
  if (!text) return minHeight;

  // Use cache key combining text length and device type for faster lookups
  const cacheKey = `${text.length}:${isTablet}:${text.slice(0, 100)}`;
  const cached = heightCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const charsPerLine = isTablet ? CHARS_PER_LINE_TABLET : CHARS_PER_LINE_PHONE;
  const lineCount = text.split('\n').reduce((total, line) => {
    if (!line) return total + 1;
    return total + Math.max(1, Math.ceil(line.length / charsPerLine));
  }, 0);

  const height = Math.max(
    minHeight,
    lineCount * NOTE_DOCUMENT_BODY_LINE_HEIGHT + NOTE_DOCUMENT_INPUT_VERTICAL_PADDING,
  );

  // Keep cache size bounded
  if (heightCache.size >= MAX_CACHE_SIZE) {
    const firstKey = heightCache.keys().next().value;
    if (firstKey !== undefined) heightCache.delete(firstKey);
  }
  heightCache.set(cacheKey, height);

  return height;
}
