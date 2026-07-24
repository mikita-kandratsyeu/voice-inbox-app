import { normalizeInlineSpeakerLabelsToParagraphBreaks } from './normalizeSpeakerTurnsMarkdown';

describe('normalizeInlineSpeakerLabelsToParagraphBreaks', () => {
  it('inserts paragraph breaks before inline speaker labels', () => {
    const input = 'Участник 1: first. Участник 2: second.';
    expect(normalizeInlineSpeakerLabelsToParagraphBreaks(input)).toBe(
      'Участник 1: first.\n\nУчастник 2: second.',
    );
  });

  it('supports English speaker labels', () => {
    const input = 'Speaker 1: one. Speaker 2: two.';
    expect(normalizeInlineSpeakerLabelsToParagraphBreaks(input)).toBe(
      'Speaker 1: one.\n\nSpeaker 2: two.',
    );
  });

  it('returns input unchanged when no colon is present', () => {
    const input = 'No speakers here';
    expect(normalizeInlineSpeakerLabelsToParagraphBreaks(input)).toBe(input);
  });
});
