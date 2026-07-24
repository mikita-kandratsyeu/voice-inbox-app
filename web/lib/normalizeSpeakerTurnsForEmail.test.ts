import {
  SHARE_SPEAKER_TURNS_SECTION_MARKER,
  stripShareNoteSectionMarkers,
} from './shareNoteSectionMarkers';
import {
  expandBoldSpeakerBlocksToColonLines,
  normalizeSpeakerTurnsForEmail,
  splitSpeakerTurnEntries,
} from './normalizeSpeakerTurnsForEmail';

const TABLE_MARKER = '§§SHARE_NOTE_TABLE§§';

describe('expandBoldSpeakerBlocksToColonLines', () => {
  it('converts bold speaker headings into colon lines', () => {
    const input = `**Участник 1**

Первая реплика.

**Участник 2**

Вторая реплика.`;

    const result = expandBoldSpeakerBlocksToColonLines(input);
    expect(result).toContain('Участник 1: Первая реплика.');
    expect(result).toContain('Участник 2: Вторая реплика.');
  });

  it('returns input unchanged when no bold speaker headings exist', () => {
    const input = 'Участник 1: inline';
    expect(expandBoldSpeakerBlocksToColonLines(input)).toBe(input);
  });
});

describe('splitSpeakerTurnEntries', () => {
  it('parses colon-style speaker lines', () => {
    expect(splitSpeakerTurnEntries('Участник 1: First.\n\nУчастник 2: Second.')).toEqual([
      { speaker: 'Участник 1', text: 'First.' },
      { speaker: 'Участник 2', text: 'Second.' },
    ]);
  });

  it('merges continuation lines into previous speaker', () => {
    expect(splitSpeakerTurnEntries('Участник 1: First line\ncontinuation')).toEqual([
      { speaker: 'Участник 1', text: 'First line continuation' },
    ]);
  });

  it('splits inline speaker labels', () => {
    expect(splitSpeakerTurnEntries('Участник 1: one. Участник 2: two.')).toEqual([
      { speaker: 'Участник 1', text: 'one.' },
      { speaker: 'Участник 2', text: 'two.' },
    ]);
  });

  it('parses markdown table rows', () => {
    expect(splitSpeakerTurnEntries('| Участник 1 | Первая |\n| Участник 2 | Вторая |')).toEqual([
      { speaker: 'Участник 1', text: 'Первая' },
      { speaker: 'Участник 2', text: 'Вторая' },
    ]);
  });

  it('skips markdown table header row', () => {
    expect(
      splitSpeakerTurnEntries('| Speaker | Text |\n| --- | --- |\n| Участник 1 | Hi |'),
    ).toEqual([{ speaker: 'Участник 1', text: 'Hi' }]);
  });
});

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

    expect(stripShareNoteSectionMarkers(result)).not.toContain(SHARE_SPEAKER_TURNS_SECTION_MARKER);
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

  it('keeps disclaimer and heading outside the table block', () => {
    const markdown = `## По участникам

_Дисклеймер._

Участник 1: Реплика.`;

    const result = normalizeSpeakerTurnsForEmail(markdown);

    expect(result).toContain('_Дисклеймер._');
    expect(result).toContain(TABLE_MARKER);
  });

  it('stops speaker section at the next heading', () => {
    const markdown = `## По участникам

Участник 1: Inside section.

## Следующие шаги

- task`;

    const result = normalizeSpeakerTurnsForEmail(markdown);

    expect(result).toContain('## Следующие шаги');
    expect(result).toContain('- task');
    expect(result).toContain(TABLE_MARKER);
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

  it('returns markdown unchanged when no speaker section is present', () => {
    const markdown = '## Summary\n\nJust text.';
    expect(normalizeSpeakerTurnsForEmail(markdown)).toBe(markdown);
  });

  it('returns markdown unchanged when speaker section has no turns', () => {
    const markdown = `## По участникам

_Пока пусто._`;
    expect(normalizeSpeakerTurnsForEmail(markdown)).toBe(markdown);
  });
});
