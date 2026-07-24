jest.mock('@/shared/lib', () => ({
  i18n: {
    language: 'ru',
    t: (key: string) => {
      const labels: Record<string, string> = {
        'share.dateLabel': 'Дата',
        'share.durationLabel': 'Длительность',
        'share.folderLabel': 'Папка',
      };
      return labels[key] ?? key;
    },
  },
  formatShortDate: () => '14 июня',
}));

jest.mock('@/features/share-record/lib/shareExportContext', () => ({
  resolveShareExportContext: (ctx?: object) => ({ forDocument: true, ...(ctx ?? {}) }),
}));

jest.mock('@/features/share-record/lib/documentMetadataMarkdown', () => ({
  buildDocumentMetadataMarkdownLines: () => [
    '**Дата:** 14 июня',
    '**Длительность:** 2:30',
    '**Папка:** Личное',
  ],
}));

import type { VoiceRecord } from '@/entities/record';

import {
  finalizeNoteDocumentFromSourceEditor,
  prepareNoteDocumentForSourceEditor,
  restoreDocumentMetadataInPreamble,
  stripDocumentMetadataForSourceEditor,
} from '../noteDocumentSourceEditorMarkdown';

const record: VoiceRecord = {
  id: 'rec_note_doc',
  title: 'Writing is telepathy',
  transcript: 'Body',
  duration: '2:30',
  createdAt: '2026-06-14T10:00:00.000Z',
  status: 'read',
  isPinned: false,
  folderId: 'folder_personal',
};

const markdown = [
  '# Writing is telepathy',
  '',
  '**Дата:** 14 июня',
  '**Длительность:** 2:30',
  '**Папка:** Личное',
  '',
  '<!-- vi:section:summary -->',
  '## Summary',
  'Recap text',
].join('\n');

describe('noteDocumentSourceEditorMarkdown', () => {
  it('strips metadata from the preamble for source editing', () => {
    expect(prepareNoteDocumentForSourceEditor(markdown)).toBe(
      [
        '# Writing is telepathy',
        '',
        '<!-- vi:section:summary -->',
        '## Summary',
        'Recap text',
      ].join('\n'),
    );
  });

  it('restores metadata after source editing', () => {
    const edited = [
      '# Writing is telepathy',
      '',
      '<!-- vi:section:summary -->',
      '## Summary',
      'Updated recap',
    ].join('\n');

    const restored = finalizeNoteDocumentFromSourceEditor(edited, record, {
      folderNameById: { folder_personal: 'Личное' },
    });

    expect(restored).toContain('**Дата:** 14 июня');
    expect(restored).toContain('**Длительность:** 2:30');
    expect(restored).toContain('**Папка:** Личное');
    expect(restored).toContain('Updated recap');
  });

  it('does not duplicate metadata when it is already present', () => {
    const restored = restoreDocumentMetadataInPreamble(markdown, ['**Дата:** 14 июня']);
    expect(restored).toBe(markdown);
  });

  it('stripDocumentMetadataForSourceEditor keeps preamble body text', () => {
    const withIntro = [
      '# Writing is telepathy',
      '',
      '**Дата:** 14 июня',
      '',
      '_Meeting recap_',
      '',
      '<!-- vi:section:tasks -->',
      '## Tasks',
    ].join('\n');

    expect(stripDocumentMetadataForSourceEditor(withIntro)).toBe(
      [
        '# Writing is telepathy',
        '',
        '_Meeting recap_',
        '',
        '<!-- vi:section:tasks -->',
        '## Tasks',
      ].join('\n'),
    );
  });
});
