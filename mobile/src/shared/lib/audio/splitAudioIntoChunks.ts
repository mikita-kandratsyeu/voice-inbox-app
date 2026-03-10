export type AudioChunk = {
  offsetMs: number;
  durationMs: number;
  index: number;
};

export const splitAudioIntoChunks = (
  totalDuration: number,
  chunkDuration: number = 27,
  overlapDuration: number = 3,
): AudioChunk[] => {
  const chunks: AudioChunk[] = [];
  const stepDuration = chunkDuration - overlapDuration;

  let startSec = 0;
  let index = 0;

  while (startSec < totalDuration) {
    const actualDuration = Math.min(chunkDuration, totalDuration - startSec);

    chunks.push({
      offsetMs: Math.round(startSec * 1000),
      durationMs: Math.round(actualDuration * 1000),
      index,
    });

    startSec += stepDuration;
    index++;
  }

  return chunks;
};
