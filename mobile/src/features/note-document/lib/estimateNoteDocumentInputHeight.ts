/** Keep in sync with `NOTE_DOCUMENT_BODY_LINE_HEIGHT` in `documentMarkdownTheme`. */
const NOTE_DOCUMENT_BODY_LINE_HEIGHT = 28;

const INPUT_VERTICAL_PADDING = 16;

/**
 * Fallback height before/without a reliable `onContentSizeChange` measurement.
 * For long texts, we return minHeight and let native measurement handle it.
 */
export function estimateNoteDocumentInputHeight(
  text: string,
  minHeight: number,
  isTablet: boolean,
): number {
  if (!text) return minHeight;

  // For very long texts (e.g., documents), don't try to estimate -
  // let the native onContentSizeChange provide accurate height
  const lineBreaks = (text.match(/\n/g) || []).length;
  if (lineBreaks > 50 || text.length > 2000) {
    return minHeight;
  }

  const charsPerLine = isTablet ? 91 : 42;
  const lineCount = text.split('\n').reduce((total, line) => {
    if (!line) return total + 1;
    return total + Math.max(1, Math.ceil(line.length / charsPerLine));
  }, 0);

  return Math.max(minHeight, lineCount * NOTE_DOCUMENT_BODY_LINE_HEIGHT + INPUT_VERTICAL_PADDING);
}
