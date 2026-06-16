import { NOTE_DOCUMENT_LINKED_SECTION_MARKER } from '../appendLinkedNotesSectionForReading';
import { parseLinkedNotesFromSourceEditor } from '../parseLinkedNotesFromSourceEditor';

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
    status: 'unread',
    createdAt: '2026-01-02T10:00:00.000Z',
  },
];

describe('parseLinkedNotesFromSourceEditor', () => {
  it('parses wiki bullets by record id', () => {
    const markdown = `${NOTE_DOCUMENT_LINKED_SECTION_MARKER}

## Linked notes

- [[rec_1_aaa|Alpha Note]]
- [[rec_2_bbb|Beta Note]]
`;

    expect(parseLinkedNotesFromSourceEditor(markdown, 'rec_self', records)).toEqual({
      ok: true,
      linkedRecordIds: ['rec_1_aaa', 'rec_2_bbb'],
    });
  });

  it('returns empty list when linked section marker is missing', () => {
    expect(parseLinkedNotesFromSourceEditor('# Note', 'rec_self', records)).toEqual({
      ok: true,
      linkedRecordIds: [],
    });
  });

  it('returns empty list when section has no bullets', () => {
    const markdown = `${NOTE_DOCUMENT_LINKED_SECTION_MARKER}

## Linked notes
`;

    expect(parseLinkedNotesFromSourceEditor(markdown, 'rec_self', records)).toEqual({
      ok: true,
      linkedRecordIds: [],
    });
  });

  it('rejects invalid wiki syntax', () => {
    const markdown = `${NOTE_DOCUMENT_LINKED_SECTION_MARKER}

## Linked notes

- [[broken link
`;

    expect(parseLinkedNotesFromSourceEditor(markdown, 'rec_self', records)).toEqual({ ok: false });
  });

  it('rejects unresolved targets and self links', () => {
    const unresolved = `${NOTE_DOCUMENT_LINKED_SECTION_MARKER}

## Linked notes

- [[Missing Note]]
`;
    expect(parseLinkedNotesFromSourceEditor(unresolved, 'rec_self', records)).toEqual({ ok: false });

    const selfLink = `${NOTE_DOCUMENT_LINKED_SECTION_MARKER}

## Linked notes

- [[rec_self|Self]]
`;
    expect(parseLinkedNotesFromSourceEditor(selfLink, 'rec_self', records)).toEqual({ ok: false });
  });
});
