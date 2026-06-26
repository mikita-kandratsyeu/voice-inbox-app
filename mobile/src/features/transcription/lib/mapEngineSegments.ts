import type { TranscriptSegment } from '@/entities/record';

import { cleanTranscriptSegmentText } from './cleanTranscriptText';
import type { TranscriptionEngineSegment } from './transcriptionEngineTypes';

const formatTimestamp = (startMs: number): string => {
  const totalSeconds = Math.floor(startMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const mapEngineSegmentsToTranscriptSegments = (
  segments: TranscriptionEngineSegment[],
  offset = 0,
): TranscriptSegment[] =>
  segments
    .map((segment, index) => ({
      id: segment.id || String(offset + index),
      startTime: formatTimestamp(segment.startMs),
      startMs: segment.startMs,
      endMs: segment.endMs,
      text: cleanTranscriptSegmentText(segment.text),
      speakerId: segment.speakerId,
      language: segment.language,
      isOverlapping: segment.isOverlapping,
      tokens: segment.tokens,
    }))
    .filter((segment) => segment.text.length > 0);
