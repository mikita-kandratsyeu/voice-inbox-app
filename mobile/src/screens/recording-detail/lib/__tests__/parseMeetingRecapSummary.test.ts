import {
  parseMeetingRecapSummary,
  restoreMeetingSummaryFromDocumentMarkdown,
} from '../parseMeetingRecapSummary';

describe('parseMeetingRecapSummary', () => {
  it('parses Russian meeting recap sections', () => {
    const sections = parseMeetingRecapSummary(
      [
        'Коротко:',
        'Обсудили запуск новой версии.',
        '',
        'Решения:',
        'Выпустить сборку в пятницу.',
        '',
        'Задачи:',
        'Маша проверит оплату.',
        '',
        'Открытые вопросы:',
        'Нет.',
        '',
        'Следующие шаги:',
        'Сверить статус перед релизом.',
      ].join('\n'),
    );

    expect(sections.map((section) => section.kind)).toEqual([
      'brief',
      'decisions',
      'tasks',
      'openQuestions',
      'nextSteps',
    ]);
    expect(sections[1]?.body).toBe('Выпустить сборку в пятницу.');
  });

  it('parses English headings and treats plain meeting prose as one brief section', () => {
    expect(
      parseMeetingRecapSummary('Brief:\nLaunch recap.\n\nNext steps:\nSend the update.'),
    ).toHaveLength(2);
    expect(parseMeetingRecapSummary('The team discussed launch status.')).toEqual([
      expect.objectContaining({ kind: 'brief', body: 'The team discussed launch status.' }),
    ]);
  });

  it('parses inline sections returned as a dense paragraph', () => {
    const sections = parseMeetingRecapSummary(
      'Коротко: Обсуждение переноса сроков. Решения: 1. Сроки переносятся. 2. Список будет доработан. Задачи: None Открытые вопросы: 1. Как реализовать RFID? Следующие шаги: 1. Переслать итоги встречи.',
    );

    expect(sections.map((section) => section.kind)).toEqual([
      'brief',
      'decisions',
      'tasks',
      'openQuestions',
      'nextSteps',
    ]);
    expect(sections[0]?.body).toBe('Обсуждение переноса сроков.');
    expect(sections[1]?.body).toContain('2. Список будет доработан.');
  });

  it('keeps orphan lines before the first section header as brief', () => {
    const sections = parseMeetingRecapSummary(
      ['- Обсуждалась разработка материала.', '', 'Решения:', '- Срок перенесён.'].join('\n'),
    );

    expect(sections.map((section) => section.kind)).toEqual(['brief', 'decisions']);
    expect(sections[0]?.body).toBe('- Обсуждалась разработка материала.');
  });

  it('restores meeting summary from document markdown headings', () => {
    const restored = restoreMeetingSummaryFromDocumentMarkdown(
      ['### Коротко', '- Обсудили запуск.', '', '### Решения', '- Выпустить сборку.'].join('\n'),
    );

    expect(restored).toContain('Коротко:');
    expect(restored).toContain('- Обсудили запуск.');
    expect(restored).toContain('Решения:');
    expect(restored).toContain('- Выпустить сборку.');

    const sections = parseMeetingRecapSummary(restored);
    expect(sections.map((section) => section.kind)).toEqual(['brief', 'decisions']);
  });

  it('restores meeting summary from level-2 document headings', () => {
    const restored = restoreMeetingSummaryFromDocumentMarkdown(
      ['## Коротко', '- Обсудили запуск.', '', '## Решения', '- Выпустить сборку.'].join('\n'),
    );

    expect(restored).toContain('Коротко:');
    expect(restored).toContain('Решения:');

    const sections = parseMeetingRecapSummary(restored);
    expect(sections.map((section) => section.kind)).toEqual(['brief', 'decisions']);
  });
});
