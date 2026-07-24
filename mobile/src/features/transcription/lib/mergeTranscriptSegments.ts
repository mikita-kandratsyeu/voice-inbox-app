import type { TranscriptionEngineSegment } from './transcriptionEngineTypes';

const DEFAULT_MAX_GAP_MS = 400;

/**
 * Merges adjacent segments from the same speaker when gaps are small and overlap is not flagged.
 */
export function mergeAdjacentSpeakerSegments(
  segments: TranscriptionEngineSegment[],
  maxGapMs: number = DEFAULT_MAX_GAP_MS,
): TranscriptionEngineSegment[] {
  if (segments.length <= 1) {
    return segments;
  }

  const merged: TranscriptionEngineSegment[] = [];

  for (const segment of segments) {
    const previous = merged[merged.length - 1];
    const canMerge =
      previous &&
      !previous.isOverlapping &&
      !segment.isOverlapping &&
      previous.speakerId &&
      previous.speakerId === segment.speakerId &&
      (previous.language ?? '') === (segment.language ?? '') &&
      segment.startMs - (previous.endMs ?? previous.startMs) <= maxGapMs;

    if (!canMerge || !previous) {
      merged.push({ ...segment });
      continue;
    }

    previous.text = `${previous.text} ${segment.text}`.trim();
    previous.endMs = segment.endMs;
    if (segment.tokens && segment.tokens.length > 0) {
      previous.tokens = [...(previous.tokens ?? []), ...segment.tokens];
    }
  }

  return merged;
}
