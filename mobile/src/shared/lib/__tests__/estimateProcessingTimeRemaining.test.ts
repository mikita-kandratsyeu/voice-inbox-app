import {
  estimateProcessingSecondsRemaining,
  type ProcessingTimeEstimateInput,
} from '../estimateProcessingTimeRemaining';

const START = 1_000_000;

function estimate(
  partial: Omit<ProcessingTimeEstimateInput, 'startedAtMs' | 'nowMs'> & {
    elapsedSec?: number;
  },
): number {
  const elapsedSec = partial.elapsedSec ?? 0;
  const { elapsedSec: _e, ...rest } = partial;
  return estimateProcessingSecondsRemaining({
    startedAtMs: START,
    nowMs: START + elapsedSec * 1000,
    ...rest,
  });
}

describe('estimateProcessingSecondsRemaining', () => {
  it('cloud ignores faux progress and uses elapsed time', () => {
    const early = estimate({
      context: 'cloud_ai',
      phase: 'processing',
      progressPercent: 80,
      transcriptCharCount: 3000,
      elapsedSec: 5,
    });
    const later = estimate({
      context: 'cloud_ai',
      phase: 'processing',
      progressPercent: 80,
      transcriptCharCount: 3000,
      elapsedSec: 40,
    });
    expect(early).toBeGreaterThan(later);
    expect(early).toBeGreaterThan(30);
  });

  it('private decreases with generation progress', () => {
    const low = estimate({
      context: 'private_llm',
      phase: 'processing',
      progressPercent: 20,
      transcriptCharCount: 4000,
      privateLlmBudget: 'balanced',
      elapsedSec: 25,
    });
    const high = estimate({
      context: 'private_llm',
      phase: 'processing',
      progressPercent: 70,
      transcriptCharCount: 4000,
      privateLlmBudget: 'balanced',
      elapsedSec: 25,
    });
    expect(low).toBeGreaterThan(high);
  });

  it('transcription uses segment counts when available', () => {
    const remaining = estimate({
      context: 'transcription',
      phase: 'processing',
      progressPercent: 40,
      durationMs: 120_000,
      transcriptionSegments: { current: 2, total: 6 },
      elapsedSec: 10,
    });
    expect(remaining).toBeGreaterThanOrEqual(4 * 20);
  });

  it('longer transcript increases cloud estimate at start', () => {
    const shortNote = estimate({
      context: 'cloud_ai',
      phase: 'processing',
      progressPercent: 5,
      transcriptCharCount: 800,
      elapsedSec: 0,
    });
    const longNote = estimate({
      context: 'cloud_ai',
      phase: 'processing',
      progressPercent: 5,
      transcriptCharCount: 12_000,
      elapsedSec: 0,
    });
    expect(longNote).toBeGreaterThan(shortNote);
  });
});
