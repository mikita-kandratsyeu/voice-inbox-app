import { TranscriptionRuntimeBenchmark } from '../transcriptionRuntimeBenchmark';

describe('TranscriptionRuntimeBenchmark', () => {
  it('records samples and computes average real-time factor', () => {
    const benchmark = new TranscriptionRuntimeBenchmark();
    benchmark.record(30, 15_000);
    benchmark.record(30, 18_000);

    expect(benchmark.getAverageRealTimeFactor()).toBeCloseTo(0.55, 2);
    expect(benchmark.getAverageSecondsPerChunk()).toBeCloseTo(16.5, 1);
  });

  it('suggests larger chunks when device is fast enough', () => {
    const benchmark = new TranscriptionRuntimeBenchmark();
    benchmark.record(30, 12_000);
    benchmark.record(30, 13_000);

    expect(
      benchmark.adaptChunkProfile({
        chunkDurationSec: 45,
        chunkOverlapSec: 4,
      }),
    ).toEqual({
      chunkDurationSec: 60,
      chunkOverlapSec: 4,
    });
  });

  it('suggests smaller chunks when device is slow', () => {
    const benchmark = new TranscriptionRuntimeBenchmark();
    benchmark.record(45, 60_000);
    benchmark.record(45, 58_000);

    expect(
      benchmark.adaptChunkProfile({
        chunkDurationSec: 45,
        chunkOverlapSec: 4,
      }),
    ).toEqual({
      chunkDurationSec: 35,
      chunkOverlapSec: 4,
    });
  });
});
