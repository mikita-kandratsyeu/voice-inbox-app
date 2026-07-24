import { formatGraphAppliedLayoutHeaderSubtitle } from '../formatGraphAppliedLayoutHeaderSubtitle';

const t = ((key: string, params?: Record<string, unknown>) => {
  if (key === 'notesGraph.saveLayoutSheet.autoName') return 'Раскладка';
  if (key === 'notesGraph.history.versionLabel') {
    return `Версия ${String(params?.version)}`;
  }
  return key;
}) as never;

describe('formatGraphAppliedLayoutHeaderSubtitle', () => {
  it('shows layout name and saved date only', () => {
    const subtitle = formatGraphAppliedLayoutHeaderSubtitle(
      {
        name: 'Моя карта',
        versionNumber: 2,
        createdAt: '2026-06-10T13:05:00.000Z',
      },
      'ru',
      t,
    );

    expect(subtitle).toMatch(/^Моя карта · /);
    expect(subtitle).not.toMatch(/\d{2}:\d{2}/);
    expect(subtitle).not.toMatch(/· .* · .* ·/);
  });

  it('collapses legacy auto names that already included a date', () => {
    const subtitle = formatGraphAppliedLayoutHeaderSubtitle(
      {
        name: 'Раскладка · 10 июня',
        versionNumber: 1,
        createdAt: '2026-06-10T13:05:00.000Z',
      },
      'ru',
      t,
    );

    expect(subtitle.startsWith('Раскладка · ')).toBe(true);
    expect(subtitle.includes('10 июня · 10 июня')).toBe(false);
  });
});
