import { prepareShareNoteWebMarkdown } from './prepareShareNoteWebMarkdown';

describe('prepareShareNoteWebMarkdown', () => {
  it('separates consecutive metadata lines for web rendering', () => {
    const markdown = `**Дата:** 14 июня
**Длительность:** 1:32

## Краткое содержание`;

    const result = prepareShareNoteWebMarkdown(markdown);

    expect(result).toContain('**Дата:** 14 июня\n\n**Длительность:** 1:32');
    expect(result).toContain('**Длительность:** 1:32\n\n## Краткое содержание');
  });

  it('adds spacing around italic lines after section headings', () => {
    const markdown = `## Резюме
_Краткий обзор встречи._
Первый абзац.`;

    const result = prepareShareNoteWebMarkdown(markdown);

    expect(result).toContain('## Резюме\n\n_Краткий обзор встречи._\n\n');
  });
});
