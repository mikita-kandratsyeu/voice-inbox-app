import type { TranscriptionChunkProfile } from './transcribeAudio';

export type ChunkBenchmarkSample = {
  chunkDurationSec: number;
  transcribeMs: number;
  realTimeFactor: number;
};

const MIN_SAMPLES_FOR_ADAPTATION = 2;
const FAST_REAL_TIME_FACTOR = 0.65;
const SLOW_REAL_TIME_FACTOR = 1.25;

export class TranscriptionRuntimeBenchmark {
  private readonly samples: ChunkBenchmarkSample[] = [];

  record(chunkDurationSec: number, transcribeMs: number): void {
    if (chunkDurationSec <= 0 || transcribeMs <= 0) return;

    this.samples.push({
      chunkDurationSec,
      transcribeMs,
      realTimeFactor: transcribeMs / (chunkDurationSec * 1000),
    });
  }

  getSamples(): readonly ChunkBenchmarkSample[] {
    return this.samples;
  }

  getAverageSecondsPerChunk(): number | null {
    if (this.samples.length === 0) return null;
    const totalMs = this.samples.reduce((sum, sample) => sum + sample.transcribeMs, 0);
    return totalMs / this.samples.length / 1000;
  }

  getAverageRealTimeFactor(): number | null {
    if (this.samples.length === 0) return null;
    const total = this.samples.reduce((sum, sample) => sum + sample.realTimeFactor, 0);
    return total / this.samples.length;
  }

  shouldAdaptProfile(): boolean {
    return this.samples.length >= MIN_SAMPLES_FOR_ADAPTATION;
  }

  adaptChunkProfile(current: TranscriptionChunkProfile): TranscriptionChunkProfile | null {
    if (!this.shouldAdaptProfile()) return null;

    const avgRtf = this.getAverageRealTimeFactor();
    if (avgRtf == null) return null;

    if (avgRtf < FAST_REAL_TIME_FACTOR && current.chunkDurationSec < 60) {
      return {
        chunkDurationSec: Math.min(60, current.chunkDurationSec + 15),
        chunkOverlapSec: current.chunkOverlapSec,
      };
    }

    if (avgRtf > SLOW_REAL_TIME_FACTOR && current.chunkDurationSec > 20) {
      return {
        chunkDurationSec: Math.max(20, current.chunkDurationSec - 10),
        chunkOverlapSec: current.chunkOverlapSec,
      };
    }

    return null;
  }
}
