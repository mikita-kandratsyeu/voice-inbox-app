import type { TranscriptSegment } from '../model/types';

/** True when transcript tab should use timed segment cards + karaoke highlight. */
export function shouldUseTranscriptSegmentView(
  segments: TranscriptSegment[],
  hasAudio: boolean,
): boolean {
  if (!hasAudio || segments.length === 0) return false;
  if (segments.length > 1) return true;
  return (segments[0]?.tokens?.length ?? 0) > 0;
}
