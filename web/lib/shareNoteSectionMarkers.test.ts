import {
  SHARE_SPEAKER_TURNS_SECTION_MARKER,
  stripShareNoteSectionMarkers,
} from './shareNoteSectionMarkers';

describe('stripShareNoteSectionMarkers', () => {
  it('removes marker lines from markdown', () => {
    const input = `## Теги

#спринт

${SHARE_SPEAKER_TURNS_SECTION_MARKER}
## По участникам`;

    const stripped = stripShareNoteSectionMarkers(input);
    expect(stripped).not.toContain('vi:section:speaker-turns');
    expect(stripped).toContain('## Теги');
    expect(stripped).toContain('## По участникам');
  });

  it('removes inline marker occurrences', () => {
    expect(stripShareNoteSectionMarkers(`prefix ${SHARE_SPEAKER_TURNS_SECTION_MARKER} suffix`)).toBe(
      'prefix  suffix',
    );
  });

  it('cleans marker left before heading when normalization used heading fallback', () => {
    const markdown = `## Теги

#спринт

${SHARE_SPEAKER_TURNS_SECTION_MARKER}
## По участникам

Участник 1: Реплика.`;

    const normalized = stripShareNoteSectionMarkers(markdown);

    expect(normalized).not.toContain('vi:section:speaker-turns');
    expect(normalized).toContain('## По участникам');
  });
});
