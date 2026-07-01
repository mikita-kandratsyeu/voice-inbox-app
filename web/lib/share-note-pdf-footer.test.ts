import {
  buildSharePdfBrandBadgeHtml,
  buildSharePdfGeneratedAtFooterHtml,
  formatSharePdfGeneratedAtText,
} from './share-note-pdf-footer';

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

  it('renders app icon mark in the top-right corner', () => {
    const html = buildSharePdfBrandBadgeHtml();

    expect(html).toContain('share-pdf-brand-badge');
    expect(html).toContain('share-pdf-brand-mark');
    expect(html).not.toContain('Voice Inbox');
  });
});
