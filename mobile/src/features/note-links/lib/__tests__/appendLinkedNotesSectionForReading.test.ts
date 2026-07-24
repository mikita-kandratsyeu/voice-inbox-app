import {
  appendLinkedNotesSectionForReading,
  appendLinkedNotesSectionForSourceEditor,
  NOTE_DOCUMENT_LINKED_SECTION_MARKER,
  stripLinkedNotesSectionFromSourceEditor,
} from '../appendLinkedNotesSectionForReading';

const records = [
  {
    id: 'rec_1_aaa',
    title: 'Alpha Note',
    status: 'unread',
    createdAt: '2026-01-01T10:00:00.000Z',
  },
  {
    id: 'rec_2_bbb',
    title: 'Beta Note',
    status: 'archived',
    createdAt: '2026-01-02T10:00:00.000Z',
  },
];

describe('appendLinkedNotesSectionForReading', () => {
  it('appends wiki links for linked records', () => {
    const result = appendLinkedNotesSectionForReading(
      '# Note body',
      ['rec_1_aaa', 'rec_2_bbb', 'missing'],
      records,
      'Linked notes',
    );

    expect(result).toContain('## Linked notes');
    expect(result).toContain('- [[rec_1_aaa|Alpha Note]]');
    expect(result).toContain('- [[rec_2_bbb|Beta Note]]');
    expect(result).not.toContain('missing');
  });

  it('returns markdown unchanged when there are no links', () => {
    const markdown = '# Note body';
    expect(appendLinkedNotesSectionForReading(markdown, [], records, 'Linked notes')).toBe(
      markdown,
    );
  });
});

describe('appendLinkedNotesSectionForSourceEditor', () => {
  it('appends vi:section:linked with wiki list items', () => {
    const result = appendLinkedNotesSectionForSourceEditor(
      '# Note body',
      ['rec_1_aaa'],
      records,
      'Linked notes',
    );

    expect(result).toContain(NOTE_DOCUMENT_LINKED_SECTION_MARKER);
    expect(result).toContain('## Linked notes');
    expect(result).toContain('- [[rec_1_aaa|Alpha Note]]');
  });

  it('strips linked section on save round-trip', () => {
    const withLinked = appendLinkedNotesSectionForSourceEditor(
      '# Note body',
      ['rec_1_aaa'],
      records,
      'Linked notes',
    );

    expect(stripLinkedNotesSectionFromSourceEditor(withLinked)).toBe('# Note body');
  });

  it('replaces an existing linked section when links change', () => {
    const activeRecords = [
      ...records,
      {
        id: 'rec_3_ccc',
        title: 'Gamma Note',
        status: 'unread' as const,
        createdAt: '2026-01-03T10:00:00.000Z',
      },
    ];
    const initial = appendLinkedNotesSectionForSourceEditor(
      '# Note body',
      ['rec_1_aaa'],
      activeRecords,
      'Linked notes',
    );
    const updated = appendLinkedNotesSectionForSourceEditor(
      initial,
      ['rec_3_ccc'],
      activeRecords,
      'Linked notes',
    );

    expect(updated).not.toContain('rec_1_aaa');
    expect(updated).toContain('- [[rec_3_ccc|Gamma Note]]');
  });
});
