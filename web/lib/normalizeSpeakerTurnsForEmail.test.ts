import { SHARE_SPEAKER_TURNS_SECTION_MARKER } from './shareNoteSectionMarkers';
import { normalizeSpeakerTurnsForEmail } from './normalizeSpeakerTurnsForEmail';

const TABLE_MARKER = '§§SHARE_NOTE_TABLE§§';

describe('normalizeSpeakerTurnsForEmail', () => {
  it('converts stable section marker into an email table block', () => {
    const markdown = `## Теги

#спринт

${SHARE_SPEAKER_TURNS_SECTION_MARKER}
## Любой заголовок из i18n

_Дисклеймер._

Участник 1: Первая реплика.

Участник 2: Вторая реплика.`;

    const result = normalizeSpeakerTurnsForEmail(markdown);

    expect(result).not.toContain(SHARE_SPEAKER_TURNS_SECTION_MARKER);
    expect(result).toContain('## Любой заголовок из i18n');
    expect(result).toContain(TABLE_MARKER);
    expect(result).not.toMatch(/Участник 1: Первая реплика\./);
  });

  it('converts mobile "По участникам" section into an email table block', () => {
    const markdown = `## Теги

#спринт

## По участникам

_Реплики сгруппированы для удобного просмотра._

Участник 1: Первая реплика.

Участник 2: Вторая реплика.`;

    const result = normalizeSpeakerTurnsForEmail(markdown);

    expect(result).toContain('## По участникам');
    expect(result).toContain(TABLE_MARKER);
    expect(result).toContain('Участник 1');
    expect(result).toContain('Первая реплика.');
    expect(result).not.toMatch(/Участник 1: Первая реплика\./);
  });

  it('still supports legacy "Реплики по спикерам" heading', () => {
    const markdown = `## Реплики по спикерам

Участник 1: Одна реплика.`;

    const result = normalizeSpeakerTurnsForEmail(markdown);

    expect(result).toContain(TABLE_MARKER);
  });

  it('converts English "Participants" section', () => {
    const markdown = `## Participants

Speaker 1: First line.

Speaker 2: Second line.`;

    const result = normalizeSpeakerTurnsForEmail(markdown);

    expect(result).toContain(TABLE_MARKER);
    expect(result).toContain('Speaker 1');
  });
});
