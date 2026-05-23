/**
 * Mobile share export joins transcript segments with single `\n` (`[MM:SS] text` per line).
 * CommonMark collapses those into one HTML paragraph in transactional email.
 * Insert paragraph breaks before each timestamp line without changing the `.md` attachment.
 */
const TRANSCRIPT_TIMESTAMP_LINE = /^\[\d{1,2}:\d{2}\]\s/;

export function normalizeTranscriptTimestampLinesForEmail(markdown: string): string {
  if (!TRANSCRIPT_TIMESTAMP_LINE.test(markdown)) {
    return markdown;
  }

  return markdown.replace(/\r?\n(?=\[\d{1,2}:\d{2}\]\s)/g, '\n\n');
}
