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
});
