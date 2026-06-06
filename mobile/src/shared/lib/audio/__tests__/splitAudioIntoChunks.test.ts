import { splitAudioIntoChunks } from '../splitAudioIntoChunks';

describe('splitAudioIntoChunks', () => {
  it('splits audio with overlap and clamps the final chunk', () => {
    expect(splitAudioIntoChunks(50, 20, 5)).toEqual([
      { index: 0, offsetMs: 0, durationMs: 20000 },
      { index: 1, offsetMs: 15000, durationMs: 20000 },
      { index: 2, offsetMs: 30000, durationMs: 20000 },
      { index: 3, offsetMs: 45000, durationMs: 5000 },
    ]);
  });

  it('keeps sub-second offsets stable', () => {
    expect(splitAudioIntoChunks(2.6, 1.1, 0.4)).toEqual([
      { index: 0, offsetMs: 0, durationMs: 1100 },
      { index: 1, offsetMs: 700, durationMs: 1100 },
      { index: 2, offsetMs: 1400, durationMs: 1100 },
      { index: 3, offsetMs: 2100, durationMs: 500 },
    ]);
  });
});
