import { splitNoteDocumentPreamble } from '../splitNoteDocumentPreamble';

describe('splitNoteDocumentPreamble', () => {
  it('extracts title and metadata chips content', () => {
    const markdown = [
      '# Writing is telepathy',
      '',
      '**Дата:** 14 июня',
      '**Длительность:** 00:00',
      '**Папка:** Личное',
      '',
      '_Meeting recap_',
    ].join('\n');

    expect(splitNoteDocumentPreamble(markdown)).toEqual({
      title: 'Writing is telepathy',
      metadataLines: ['Дата: 14 июня', 'Длительность: 00:00', 'Папка: Личное'],
      bodyMarkdown: '_Meeting recap_',
    });
  });

  it('returns body-only markdown when no hero lines are present', () => {
    const markdown = 'Plain intro paragraph.\n\nMore text.';
    expect(splitNoteDocumentPreamble(markdown)).toEqual({
      title: null,
      metadataLines: [],
      bodyMarkdown: markdown,
    });
  });
});
