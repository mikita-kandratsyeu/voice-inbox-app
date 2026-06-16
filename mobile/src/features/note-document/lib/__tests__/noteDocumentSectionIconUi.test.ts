import {
  NOTE_DOCUMENT_SECTION_ICONS,
  resolveNoteDocumentSectionIcon,
} from '../noteDocumentSectionIconUi';

describe('noteDocumentSectionIconUi', () => {
  it('maps known section ids to distinct icons', () => {
    expect(resolveNoteDocumentSectionIcon('summary')).toBe(NOTE_DOCUMENT_SECTION_ICONS.summary);
    expect(resolveNoteDocumentSectionIcon('key-phrases')).toBe(
      NOTE_DOCUMENT_SECTION_ICONS['key-phrases'],
    );
    expect(resolveNoteDocumentSectionIcon('transcript')).toBe(
      NOTE_DOCUMENT_SECTION_ICONS.transcript,
    );
    expect(resolveNoteDocumentSectionIcon('linked')).toBe(NOTE_DOCUMENT_SECTION_ICONS.linked);
  });

  it('returns null for unknown section ids', () => {
    expect(resolveNoteDocumentSectionIcon('unknown-section')).toBeNull();
    expect(resolveNoteDocumentSectionIcon()).toBeNull();
  });
});
