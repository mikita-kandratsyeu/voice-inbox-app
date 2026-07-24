import { mergeAdjacentSpeakerSegments } from '../mergeTranscriptSegments';

describe('mergeAdjacentSpeakerSegments', () => {
  it('merges adjacent segments from the same speaker within gap threshold', () => {
    const segments = [
      {
        id: '0',
        text: 'Hello',
        startMs: 0,
        endMs: 1000,
        speakerId: 'spk_a',
      },
      {
        id: '1',
        text: 'world',
        startMs: 1200,
        endMs: 2000,
        speakerId: 'spk_a',
      },
    ];

    const merged = mergeAdjacentSpeakerSegments(segments);

    expect(merged).toHaveLength(1);
    expect(merged[0].text).toBe('Hello world');
    expect(merged[0].endMs).toBe(2000);
  });

  it('does not merge when speakers differ', () => {
    const segments = [
      {
        id: '0',
        text: 'A',
        startMs: 0,
        endMs: 1000,
        speakerId: 'spk_a',
      },
      {
        id: '1',
        text: 'B',
        startMs: 1100,
        endMs: 2000,
        speakerId: 'spk_b',
      },
    ];

    expect(mergeAdjacentSpeakerSegments(segments)).toHaveLength(2);
  });

  it('does not merge overlapping segments', () => {
    const segments = [
      {
        id: '0',
        text: 'A',
        startMs: 0,
        endMs: 1000,
        speakerId: 'spk_a',
        isOverlapping: true,
      },
      {
        id: '1',
        text: 'B',
        startMs: 1100,
        endMs: 2000,
        speakerId: 'spk_a',
      },
    ];

    expect(mergeAdjacentSpeakerSegments(segments)).toHaveLength(2);
  });
});
