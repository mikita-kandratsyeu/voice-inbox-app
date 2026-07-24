import { prepareShareNoteEmailMarkdown } from './prepareShareNoteEmailMarkdown';
import { SHARE_SPEAKER_TURNS_SECTION_MARKER } from './shareNoteSectionMarkers';

const TABLE_MARKER = '§§SHARE_NOTE_TABLE§§';

describe('prepareShareNoteEmailMarkdown', () => {
  it('strips section markers and converts speaker turns to tables', () => {
    const markdown = `## Теги

#спринт

${SHARE_SPEAKER_TURNS_SECTION_MARKER}
## По участникам

_Дисклеймер._

Участник 1: Первая реплика.

Участник 2: Вторая реплика.`;

    const result = prepareShareNoteEmailMarkdown(markdown);

    expect(result).not.toContain('vi:section:speaker-turns');
    expect(result).toContain('## По участникам');
    expect(result).toContain(TABLE_MARKER);
    expect(result).not.toMatch(/Участник 1: Первая реплика\./);
  });

  it('converts transcript and speaker sections in one note', () => {
    const markdown = `${SHARE_SPEAKER_TURNS_SECTION_MARKER}
## По участникам

Участник 1: Hi.

## Транскрипт

[00:00] Start
[00:42] End`;

    const result = prepareShareNoteEmailMarkdown(markdown);

    expect(result).not.toContain(SHARE_SPEAKER_TURNS_SECTION_MARKER);
    expect(result.match(new RegExp(TABLE_MARKER, 'g'))?.length).toBe(2);
    expect(result).toContain('00:42');
    expect(result).toContain('Участник 1');
  });

  it('strips wiki links to readable labels', () => {
    const markdown = `- [x] Task
  - **Linked note:** [[rec_follow|Follow-up recap note]]`;

    const result = prepareShareNoteEmailMarkdown(markdown);

    expect(result).toContain('Follow-up recap note');
    expect(result).not.toContain('[[rec_follow');
  });
});
