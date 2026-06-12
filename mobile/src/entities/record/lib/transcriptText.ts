const DOCUMENT_TRANSCRIPT_TIMESTAMP_RE =
  /\*\*(\[[\d]{1,2}:[\d]{2}(?::[\d]{2})?\]|[\d]{1,2}:[\d]{2}(?::[\d]{2})?)\*\*/g;

/** Removes share/document bold timestamps (`**[00:42]**`) from plain transcript text. */
export function stripDocumentTranscriptMarkup(text: string): string {
  return text
    .replace(/^\*\*(\[[\d:]+\]|[\d]{1,2}:[\d]{2}(?::[\d]{2})?)\*\*\s*(?:\n+)?/gm, '')
    .replace(DOCUMENT_TRANSCRIPT_TIMESTAMP_RE, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const PLAIN_TEXT_LINE_HEIGHT = 20;
const PLAIN_TEXT_VERTICAL_PADDING = 20;

/** Estimates multiline TextInput height when `onContentSizeChange` has not fired yet. */
export function estimatePlainTextInputHeight(text: string, minHeight: number): number {
  if (!text.trim()) return minHeight;

  const wrappedLineCount = text.split('\n').reduce((total, line) => {
    const trimmed = line.trim();
    if (!trimmed) return total + 1;
    return total + Math.max(1, Math.ceil(trimmed.length / 40));
  }, 0);

  return Math.max(
    minHeight,
    wrappedLineCount * PLAIN_TEXT_LINE_HEIGHT + PLAIN_TEXT_VERTICAL_PADDING,
  );
}
