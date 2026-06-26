import type { TranscriptionEngineSegment } from './transcriptionEngineTypes';

export type DiarizationSegment = {
  speakerId: string;
  startMs: number;
  endMs: number;
  confidence?: number;
};

const overlapMs = (
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): number => Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));

/**
 * Assigns speakerId to ASR segments by maximum temporal overlap with diarization turns.
 * Marks overlapping speech when multiple speakers exceed the threshold.
 */
export function assignSpeakersByOverlap(
  segments: TranscriptionEngineSegment[],
  diarization: DiarizationSegment[],
  options?: { overlapTieThresholdMs?: number; multiSpeakerThresholdMs?: number },
): TranscriptionEngineSegment[] {
  const tieThreshold = options?.overlapTieThresholdMs ?? 80;
  const multiThreshold = options?.multiSpeakerThresholdMs ?? 120;

  return segments.map((segment) => {
    const overlaps = diarization
      .map((turn) => ({
        speakerId: turn.speakerId,
        overlap: overlapMs(segment.startMs, segment.endMs, turn.startMs, turn.endMs),
        confidence: turn.confidence,
      }))
      .filter((item) => item.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap);

    if (overlaps.length === 0) {
      return segment;
    }

    const best = overlaps[0];
    const second = overlaps[1];
    const isOverlapping =
      second != null &&
      second.overlap >= multiThreshold &&
      best.overlap - second.overlap <= tieThreshold;

    return {
      ...segment,
      speakerId: best.speakerId,
      isOverlapping: isOverlapping || segment.isOverlapping,
    };
  });
}

export function buildDefaultSpeakers(
  diarization: DiarizationSegment[],
  existingLabels?: Record<string, string>,
): Array<{ id: string; label: string }> {
  const ids = [...new Set(diarization.map((segment) => segment.speakerId))];
  return ids.map((id, index) => ({
    id,
    label: existingLabels?.[id] ?? `Speaker ${index + 1}`,
  }));
}
