import { buildShareNotePdfHtmlDocument } from './share-note-pdf-html';
import {
  getShareNoteEmailPreviewMarkdown,
  getShareNoteEmailPreviewTitle,
} from './share-note-email-preview-fixtures';

describe('buildShareNotePdfHtmlDocument', () => {
  it('renders speaker turns in a two-column table with bold labels', () => {
    const html = buildShareNotePdfHtmlDocument(
      getShareNoteEmailPreviewMarkdown('speaker-turns'),
      getShareNoteEmailPreviewTitle('speaker-turns'),
    );

    expect(html).toContain('share-note-pdf-table');
    expect(html).toContain('Участник 1');
    expect(html).toContain('font-weight:600');
    expect(html).not.toMatch(/Участник 1: Первая реплика/);
  });

  it('renders transcript timestamps in an aligned table', () => {
    const html = buildShareNotePdfHtmlDocument(
      getShareNoteEmailPreviewMarkdown('transcript'),
      getShareNoteEmailPreviewTitle('transcript'),
    );

    expect(html).toContain('share-note-pdf-table');
    expect(html).toContain('00:00');
    expect(html).toContain('00:42');
    expect(html).not.toMatch(/\[00:00\] Добрый день/);
  });

  it('renders task follow-up wiki links as styled labels', () => {
    const html = buildShareNotePdfHtmlDocument(
      getShareNoteEmailPreviewMarkdown('short-note'),
      getShareNoteEmailPreviewTitle('short-note'),
    );

    expect(html).toContain('share-pdf-wiki-link');
    expect(html).toContain('Итог: отчёт отправлен');
    expect(html).not.toContain('[[rec_follow_up');
  });

  it('omits vi:section markers from transcript tables', () => {
    const html = buildShareNotePdfHtmlDocument(
      getShareNoteEmailPreviewMarkdown('transcript'),
      getShareNoteEmailPreviewTitle('transcript'),
    );

    expect(html).not.toContain('vi:section');
  });

  it('includes a muted document generation timestamp footer', () => {
    const html = buildShareNotePdfHtmlDocument(
      getShareNoteEmailPreviewMarkdown('short-note'),
      getShareNoteEmailPreviewTitle('short-note'),
      {
        generatedAt: new Date('2026-06-12T14:30:00'),
        locale: 'ru',
        appVersion: '2.0.0',
        recordId: 'rec_demo',
        siteUrl: 'https://voiceinbox.ai',
      },
    );

    expect(html).toContain('share-pdf-generated-at');
    expect(html).toContain('Документ сформирован');
    expect(html).toContain('Voice Inbox AI (2.0.0) · voiceinbox.ai');
    expect(html).toContain('ID: rec_demo · Аудио не включено');
    expect(html).not.toContain('share-pdf-brand-badge');
  });
});
