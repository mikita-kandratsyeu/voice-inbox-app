/** Keep in sync with `NOTE_DOCUMENT_BODY_LINE_HEIGHT` in `documentMarkdownTheme`. */
const NOTE_DOCUMENT_BODY_LINE_HEIGHT = 28;

const INPUT_VERTICAL_PADDING = 16;
const CHARS_PER_LINE_PHONE = 42;
const CHARS_PER_LINE_TABLET = 72;

/** Fallback height before/without a reliable `onContentSizeChange` measurement. */
export function estimateNoteDocumentInputHeight(
  text: string,
  minHeight: number,
  isTablet: boolean,
): number {
  if (!text) return minHeight;

  const charsPerLine = isTablet ? CHARS_PER_LINE_TABLET : CHARS_PER_LINE_PHONE;
  const lineCount = text.split('\n').reduce((total, line) => {
    if (!line) return total + 1;
    return total + Math.max(1, Math.ceil(line.length / charsPerLine));
  }, 0);

  return Math.max(minHeight, lineCount * NOTE_DOCUMENT_BODY_LINE_HEIGHT + INPUT_VERTICAL_PADDING);
}
