import { assignSpeakersByOverlap, buildDefaultSpeakers } from '../speakerAttribution';

describe('assignSpeakersByOverlap', () => {
  const diarization = [
    { speakerId: 'spk_a', startMs: 0, endMs: 5000 },
    { speakerId: 'spk_b', startMs: 5000, endMs: 10_000 },
  ];

  it('assigns speaker by maximum overlap', () => {
    const segments = [
      { id: '0', text: 'hello', startMs: 100, endMs: 900 },
      { id: '1', text: 'world', startMs: 5200, endMs: 7800 },
    ];

    const result = assignSpeakersByOverlap(segments, diarization);

    expect(result[0].speakerId).toBe('spk_a');
    expect(result[1].speakerId).toBe('spk_b');
  });

  it('flags overlapping speech when two speakers tie', () => {
    const overlapDiarization = [
      { speakerId: 'spk_a', startMs: 0, endMs: 6000 },
      { speakerId: 'spk_b', startMs: 4000, endMs: 10_000 },
    ];
    const segments = [{ id: '0', text: 'both', startMs: 4500, endMs: 5500 }];

    const result = assignSpeakersByOverlap(segments, overlapDiarization, {
      multiSpeakerThresholdMs: 100,
      overlapTieThresholdMs: 200,
    });

    expect(result[0].speakerId).toBe('spk_a');
    expect(result[0].isOverlapping).toBe(true);
  });

  it('leaves segments unchanged when no diarization overlap', () => {
    const segments = [{ id: '0', text: 'solo', startMs: 20_000, endMs: 21_000 }];

    const result = assignSpeakersByOverlap(segments, diarization);

    expect(result[0].speakerId).toBeUndefined();
  });
});

describe('buildDefaultSpeakers', () => {
  it('builds stable default labels', () => {
    const speakers = buildDefaultSpeakers([
      { speakerId: 'spk_b', startMs: 0, endMs: 1000 },
      { speakerId: 'spk_a', startMs: 1000, endMs: 2000 },
    ]);

    expect(speakers).toEqual([
      { id: 'spk_b', label: 'Speaker 1' },
      { id: 'spk_a', label: 'Speaker 2' },
    ]);
  });

  it('reuses existing labels when provided', () => {
    const speakers = buildDefaultSpeakers([{ speakerId: 'spk_a', startMs: 0, endMs: 1000 }], {
      spk_a: 'Alice',
    });

    expect(speakers).toEqual([{ id: 'spk_a', label: 'Alice' }]);
  });
});
