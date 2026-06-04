import { parseMeetingRecapSummary } from '../parseMeetingRecapSummary';

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

  it('parses English headings and ignores plain summaries', () => {
    expect(
      parseMeetingRecapSummary('Brief:\nLaunch recap.\n\nNext steps:\nSend the update.'),
    ).toHaveLength(2);
    expect(parseMeetingRecapSummary('The team discussed launch status.')).toEqual([]);
  });
});
