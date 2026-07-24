import {
  buildSharePdfGeneratedAtFooterHtml,
  formatSharePdfAppBrandLine,
  formatSharePdfAppVersionLine,
  formatSharePdfFooterMetaLine,
  formatSharePdfGeneratedAtText,
} from './share-note-pdf-footer';

describe('share-note-pdf-footer', () => {
  it('formats generation timestamp for RU locale', () => {
    const text = formatSharePdfGeneratedAtText(new Date('2026-06-12T14:30:00'), 'ru');
    expect(text).toContain('Документ сформирован');
    expect(text).toContain('·');
  });

  it('formats app name with version and site from env URL', () => {
    expect(formatSharePdfAppVersionLine('2.0.0')).toBe('Voice Inbox AI (2.0.0)');
    expect(formatSharePdfAppBrandLine('2.0.0', 'https://voiceinbox.ai')).toBe(
      'Voice Inbox AI (2.0.0) · voiceinbox.ai',
    );
    expect(formatSharePdfAppBrandLine('2.0.0', 'http://localhost:3000')).toBe(
      'Voice Inbox AI (2.0.0) · localhost:3000',
    );
  });

  it('formats footer meta with optional record id', () => {
    expect(formatSharePdfFooterMetaLine('en')).toBe('Audio not included');
    expect(formatSharePdfFooterMetaLine('en', 'rec_demo')).toBe(
      'ID: rec_demo · Audio not included',
    );
    expect(formatSharePdfFooterMetaLine('ru', 'rec_demo')).toBe('ID: rec_demo · Аудио не включено');
  });

  it('renders muted footer html with generation time, app brand, and meta', () => {
    const html = buildSharePdfGeneratedAtFooterHtml({
      generatedAt: new Date('2026-06-12T14:30:00'),
      locale: 'en',
      appVersion: '2.0.0',
      recordId: 'rec_demo',
      siteUrl: 'https://voiceinbox.ai',
    });

    expect(html).toContain('share-pdf-generated-at');
    expect(html).toContain('Document generated');
    expect(html).toContain('Voice Inbox AI (2.0.0) · voiceinbox.ai');
    expect(html).toContain('ID: rec_demo · Audio not included');
  });
});
