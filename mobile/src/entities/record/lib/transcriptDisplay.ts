import { countRecordCardTextFragments } from './textNoteFragments';
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

type SegmentTranscriptEditorInput = {
  transcript: string;
  transcriptSegments?: TranscriptSegment[];
  hasAudio: boolean;
};

/** True when the Edit action should open per-fragment transcript editing instead of the markdown document. */
export function shouldOpenSegmentTranscriptEditor(
  segments: TranscriptSegment[],
  { transcript, transcriptSegments, hasAudio }: SegmentTranscriptEditorInput,
): boolean {
  if (shouldUseTranscriptSegmentView(segments, hasAudio)) {
    return true;
  }

  if (hasAudio) {
    return false;
  }

  return countRecordCardTextFragments(transcript, transcriptSegments) > 1;
}
