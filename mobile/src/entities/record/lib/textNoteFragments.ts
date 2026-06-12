import type { TranscriptSegment } from '../model/types';

export function countRecordCardTextFragments(
  text: string | undefined,
  segments?: TranscriptSegment[],
): number {
  if (segments && segments.length > 0) {
    return segments.length;
  }

  const normalized = text?.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return 0;
  }

  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (paragraphs.length > 1) {
    return paragraphs.length;
  }

  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return Math.max(1, lines.length);
}
