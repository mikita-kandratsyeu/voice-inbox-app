import { buildSharePdfGeneratedAtFooterHtml, formatSharePdfGeneratedAtText } from './share-note-pdf-footer';

describe('share-note-pdf-footer', () => {
  it('formats generation timestamp for RU locale', () => {
    const text = formatSharePdfGeneratedAtText(new Date('2026-06-12T14:30:00'), 'ru');
    expect(text).toContain('Документ сформирован');
    expect(text).toContain('·');
  });

  it('renders muted footer html', () => {
    const html = buildSharePdfGeneratedAtFooterHtml({
      generatedAt: new Date('2026-06-12T14:30:00'),
      locale: 'en',
    });

    expect(html).toContain('share-pdf-generated-at');
    expect(html).toContain('Document generated');
  });
});
