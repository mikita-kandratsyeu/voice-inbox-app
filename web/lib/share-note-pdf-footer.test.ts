import {
  buildSharePdfGeneratedAtFooterHtml,
  formatSharePdfAppVersionLine,
  formatSharePdfGeneratedAtText,
} from './share-note-pdf-footer';

describe('share-note-pdf-footer', () => {
  it('formats generation timestamp for RU locale', () => {
    const text = formatSharePdfGeneratedAtText(new Date('2026-06-12T14:30:00'), 'ru');
    expect(text).toContain('Документ сформирован');
    expect(text).toContain('·');
  });

  it('formats app name with version', () => {
    expect(formatSharePdfAppVersionLine('2.0.0')).toBe('Voice Inbox AI (2.0.0)');
    expect(formatSharePdfAppVersionLine()).toBe('Voice Inbox AI (2.0.0)');
  });

  it('renders muted footer html with generation time and app version', () => {
    const html = buildSharePdfGeneratedAtFooterHtml({
      generatedAt: new Date('2026-06-12T14:30:00'),
      locale: 'en',
      appVersion: '2.0.0',
    });

    expect(html).toContain('share-pdf-generated-at');
    expect(html).toContain('Document generated');
    expect(html).toContain('Voice Inbox AI (2.0.0)');
  });
});
